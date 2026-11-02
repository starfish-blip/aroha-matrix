import sys
import os
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from celery.__main__ import main
if __name__ == '__main__':
    sys.argv = ['celery', '-A', 'audio_tasks.celery_app', 'worker', '--loglevel=info', '--pool=solo']
    main()
