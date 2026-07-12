
from pathlib import Path

from render import RenderJob
from video_metadata import VideoMetadata


PYTHON_ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = PYTHON_ROOT.parent

CURRENT_VIDEO: VideoMetadata | None = None
CURRENT_RENDER: RenderJob | None = None