
from dataclasses import dataclass
from enum import Enum
import subprocess
import threading
import time
import globals


from video_metadata import VideoMetadata


@dataclass
class RenderSettings:
    fps: int | None = None
    codec: str | None = None
    container: str = ".mp4"
    r_x: int | None = None
    r_y: int | None = None
    start: float | None = None
    length: float | None = None
    clr_ch_mixer: list[float] | None = None
    
    
    def get_ffmpeg_params(self) -> str:
        params = [ ]
        
        if self.fps is not None:
            params.append(f"fps={self.fps}")
        
        if self.r_x is not None or self.r_y is not None:
            params.append(f"scale={self.r_x if self.r_x is not None else "iw"}:{self.r_y if self.r_y is not None else "ih"}")
        
        #TODO the rest
        
        return ",".join(params)

class RenderStatus(Enum):
    PENDING = 'PENDING'
    RUNNING = 'RUNNING'
    ERROR = 'ERROR'
    DONE = 'DONE'    

class RenderJob:
    _output: str
    _metadata: VideoMetadata
    _settings : RenderSettings
    _status = RenderStatus.PENDING
    _lock = threading.Lock()
    
    def __init__(self, metadata: VideoMetadata, output_p: str, settings: RenderSettings):
        self._metadata = metadata
        self._output=output_p
        self._settings=settings
        self._status = RenderStatus.PENDING
        
    def set_status(self, status: RenderStatus):
        with self._lock:
            self._status = status
    
    def get_status(self):
        with self._lock:
            return self._status        
        
        
    def get_output_path(self):
        return str(globals.PROJECT_ROOT)+"/"+self._output+self._settings.container
    
    def start_render(self):
        thread = threading.Thread(
            target=self._run,
            daemon=True,
        )
        thread.start()
    
    def _run(self):
        self.set_status(RenderStatus.RUNNING)
        print('Started Render!')
        try:
            print('Render finished!')
            render_video(self)
            self.set_status(RenderStatus.DONE)
        except Exception as e:
            print('Render throw an exception!')
            self.set_status(RenderStatus.ERROR)
        
        
    
def render_video(render_job: RenderJob):   
    input_file = render_job._metadata.download_video()
    output_file = render_job.get_output_path()
    
    video_filters = render_job._settings.get_ffmpeg_params()
    if len(video_filters) > 0: #Commandline param only if there are actually videofilters!
        cmd = [
            "ffmpeg",
            "-i", input_file,
            "-vf", video_filters,
            "-y",  # overwrite output if exists
            output_file
        ]
    else:
        cmd = [
            "ffmpeg",
            "-i", input_file,
            "-y",  # overwrite output if exists
            output_file
        ]
    print(cmd)
    for part in cmd:
        print(part, end=' ')
        
    print("")
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.returncode)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr}")
    return output_file
        


        