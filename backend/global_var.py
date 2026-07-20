
from pathlib import Path

from render import RenderJob
from video_metadata import VideoMetadata


PYTHON_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PYTHON_ROOT.parent
OUTPUT_ROOT = "temp_video_files/output"
TEMP_ROOT_STR = str(PROJECT_ROOT)+"/temp_video_files/"

CURRENT_VIDEO: VideoMetadata | None = None
CURRENT_RENDER: RenderJob | None = None