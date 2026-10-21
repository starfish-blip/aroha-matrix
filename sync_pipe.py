# Quick File Watcher Plumbing (Run locally via Python)
import time
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class StateHandler(FileSystemEventHandler):
    def on_modified(self, event):
        if "aroha_state" in event.src_path:
            subprocess.run(["git", "add", "."])
            subprocess.run(["git", "commit", "-m", "Auto-sync: Live state updated"])
            subprocess.run(["git", "push"])
            print("Pipeline flushed: State committed and pushed.")

observer = Observer()
observer.schedule(StateHandler(), path="./data/", recursive=False)
observer.start()
try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    observer.stop()
observer.join()
