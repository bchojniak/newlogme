"""
Main daemon for ulogme tracker.

Runs the event loop for macOS, coordinating window tracking and keystroke
counting.
"""

import fcntl
import logging
import os
import signal
import sys
import threading
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

from AppKit import NSApplication, NSApplicationActivationPolicyAccessory
from Foundation import NSTimer, NSObject
from PyObjCTools import AppHelper

from .config import Config, load_config
from .storage import Storage
from .window import WindowTracker, setup_window_tracking
from .keyboard import KeystrokeCounter, setup_keystroke_monitoring, remove_keystroke_monitoring


class DaemonDelegate(NSObject):
    """NSApplication delegate for the daemon."""
    
    tracker: WindowTracker | None = None
    counter: KeystrokeCounter | None = None
    verbose: bool = False
    
    def applicationDidFinishLaunching_(self, notification) -> None:
        """Called when the application has finished launching."""
        pass
    
    def pollCallback_(self, timer) -> None:
        """Periodic callback for polling window and flushing keystrokes."""
        if self.verbose:
            logger.debug("poll tick")
        if self.tracker is not None:
            self.tracker.poll()
        if self.counter is not None:
            self.counter.poll()


class Daemon:
    """
    The main daemon class that coordinates all tracking.
    """
    
    def __init__(self, config: Config, verbose: bool = False):
        self.config = config
        self.verbose = verbose
        self.storage = Storage(config)
        self.tracker = WindowTracker(config, self.storage)
        self.tracker.verbose = verbose
        self.counter = KeystrokeCounter(config, self.storage)
        self.counter.verbose = verbose
        self._running = False
        self._observer: Any = None
        self._key_monitor: Any = None
        self._delegate: DaemonDelegate | None = None
    
    def _poll_thread(self) -> None:
        """Background thread that polls window and keystrokes."""
        while self._running:
            try:
                if self.verbose:
                    logger.debug("poll tick")
                self.tracker.poll()
                self.counter.poll()
            except (IOError, OSError) as e:
                logger.error("Poll I/O error: %s", e)
                time.sleep(5)
            except Exception as e:
                logger.exception("Unexpected poll error: %s", e)
            time.sleep(self.config.window_poll_interval)
    
    def start(self) -> None:
        """Start the daemon and run the event loop."""
        self._running = True
        
        # Set up signal handlers
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        # Initialize NSApplication as an accessory app (no dock icon, works in background)
        app = NSApplication.sharedApplication()
        app.setActivationPolicy_(NSApplicationActivationPolicyAccessory)
        
        # Create delegate
        self._delegate = DaemonDelegate.alloc().init()
        self._delegate.tracker = self.tracker
        self._delegate.counter = self.counter
        self._delegate.verbose = self.verbose
        
        app.setDelegate_(self._delegate)
        
        # Purge old data if retention is configured
        if self.config.data_retention_days > 0:
            purged = self.storage.purge_old_data(self.config.data_retention_days)
            if purged:
                logger.info("Purged %d old records (retention: %d days)", purged, self.config.data_retention_days)

        # Set up window tracking
        self._observer = setup_window_tracking(self.tracker)
        
        # Set up keystroke monitoring if enabled
        if self.config.keystrokes:
            self._key_monitor = setup_keystroke_monitoring(self.counter)
        
        # Start background polling thread (more reliable than NSTimer for background daemons)
        self._poll_thread_obj = threading.Thread(target=self._poll_thread, daemon=True)
        self._poll_thread_obj.start()
        
        logger.info("ulogme daemon started (PID: %d)", os.getpid())
        logger.info("Database: %s", self.config.absolute_db_path)
        logger.info("Window tracking: %s", "enabled" if self.config.window_titles else "disabled")
        logger.info("Keystroke counting: %s", "enabled" if self.config.keystrokes else "disabled")
        
        # Run the event loop - needed for NSWorkspace notifications and key events
        try:
            AppHelper.runEventLoop()
        except KeyboardInterrupt:
            pass
        finally:
            self.stop()
    
    def stop(self) -> None:
        """Stop the daemon."""
        if not self._running:
            return
        
        self._running = False
        logger.info("Stopping ulogme daemon...")
        
        # Clean up keystroke monitoring
        if self.config.keystrokes:
            remove_keystroke_monitoring(self.counter)
        
        # Flush any remaining keystrokes
        self.counter.poll()
        
        # Close storage
        self.storage.close()
        
        # Stop the event loop
        AppHelper.stopEventLoop()
        
        logger.info("ulogme daemon stopped")

    def _signal_handler(self, signum, frame) -> None:
        """Handle shutdown signals."""
        self.stop()
        sys.exit(0)


def get_pid_file(config: Config) -> Path:
    """Get the path to the PID file."""
    return config.absolute_db_path.parent / "tracker.pid"


def is_running(config: Config) -> tuple[bool, int | None]:
    """Check if the daemon is already running."""
    pid_file = get_pid_file(config)

    if not pid_file.exists():
        return False, None

    try:
        pid = int(pid_file.read_text().strip())
        # Check if process is still running
        os.kill(pid, 0)
        return True, pid
    except (ValueError, ProcessLookupError, PermissionError):
        # PID file exists but process is not running
        pid_file.unlink(missing_ok=True)
        return False, None


# Module-level lock file descriptor kept alive while daemon runs
_lock_fd: int | None = None


def acquire_pid_lock(config: Config) -> bool:
    """Acquire an exclusive lock on the PID file. Returns True if acquired."""
    global _lock_fd
    pid_file = get_pid_file(config)
    pid_file.parent.mkdir(parents=True, exist_ok=True)

    try:
        _lock_fd = os.open(str(pid_file), os.O_CREAT | os.O_WRONLY)
        fcntl.flock(_lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        os.ftruncate(_lock_fd, 0)
        os.write(_lock_fd, str(os.getpid()).encode())
        os.fsync(_lock_fd)
        return True
    except (OSError, IOError):
        if _lock_fd is not None:
            os.close(_lock_fd)
            _lock_fd = None
        return False


def release_pid_lock(config: Config) -> None:
    """Release the PID file lock and remove the file."""
    global _lock_fd
    if _lock_fd is not None:
        try:
            fcntl.flock(_lock_fd, fcntl.LOCK_UN)
            os.close(_lock_fd)
        except OSError:
            pass
        _lock_fd = None
    get_pid_file(config).unlink(missing_ok=True)


def run_daemon(config: Config | None = None, verbose: bool = False) -> None:
    """
    Run the daemon in the foreground.
    
    Args:
        config: Configuration to use. If None, loads from default location.
        verbose: If True, print debug output
    """
    if config is None:
        config = load_config()
    
    # Check if already running
    running, pid = is_running(config)
    if running:
        logger.error("ulogme daemon is already running (PID: %s)", pid)
        sys.exit(1)

    # Acquire exclusive PID lock (prevents race condition)
    if not acquire_pid_lock(config):
        logger.error("Could not acquire PID lock — another instance may be starting")
        sys.exit(1)

    try:
        daemon = Daemon(config, verbose=verbose)
        daemon.start()
    finally:
        release_pid_lock(config)


def stop_daemon(config: Config | None = None) -> None:
    """
    Stop the running daemon.
    
    Args:
        config: Configuration to use. If None, loads from default location.
    """
    if config is None:
        config = load_config()
    
    running, pid = is_running(config)
    
    if not running:
        logger.info("ulogme daemon is not running")
        return

    if pid is not None:
        logger.info("Stopping ulogme daemon (PID: %d)...", pid)
        try:
            os.kill(pid, signal.SIGTERM)

            # Wait for process to stop
            for _ in range(10):
                time.sleep(0.5)
                try:
                    os.kill(pid, 0)
                except ProcessLookupError:
                    logger.info("ulogme daemon stopped")
                    release_pid_lock(config)
                    return

            # Force kill if still running
            os.kill(pid, signal.SIGKILL)
            logger.info("ulogme daemon killed")
            release_pid_lock(config)
        except ProcessLookupError:
            logger.info("ulogme daemon was already stopped")
            release_pid_lock(config)
        except PermissionError:
            logger.error("Permission denied stopping process %d", pid)
            sys.exit(1)


def check_status(config: Config | None = None) -> None:
    """
    Print the status of the daemon.
    
    Args:
        config: Configuration to use. If None, loads from default location.
    """
    if config is None:
        config = load_config()
    
    running, pid = is_running(config)
    
    if running:
        logger.info("ulogme daemon is running (PID: %s)", pid)
        logger.info("Database: %s", config.absolute_db_path)
    else:
        logger.info("ulogme daemon is not running")

