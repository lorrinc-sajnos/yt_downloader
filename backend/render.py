
from dataclasses import dataclass
from enum import Enum
import subprocess
import threading
import time
import global_var


from video_metadata import VideoMetadata


@dataclass
class RenderSettings:
    fps: int | None = None
    codec: str | None = None
    audio_codec: str | None = None
    container: str = ".mp4"
    r_x: int | None = None
    r_y: int | None = None
    start: float | None = None
    length: float | None = None
    clr_ch_mixer: list[float] | None = None

    def get_ffmpeg_cmd(self, input_file: str, output_file: str) -> str:
        cmd = ["ffmpeg"]

        # Start position
        if self.start is not None:
            cmd.extend(["-ss", str(self.start)])

        # Add input file
        cmd.extend(["-i", input_file])

        if self.length is not None:
            cmd.extend(["-t", str(self.length)])

        # video filters -----------
        video_filters = []

        if self.fps is not None:
            video_filters.append(f"fps={self.fps}")

        if self.r_x is not None or self.r_y is not None:
            video_filters.append(
                f"scale={self.r_x if self.r_x is not None else "iw"}:{self.r_y if self.r_y is not None else "ih"}")

        # Color mixing
        if self.clr_ch_mixer is not None:
            flat_mtx = self.clr_ch_mixer
            colorchannelmixer = (
                f"colorchannelmixer="
                f"rr={flat_mtx[0]}:rg={flat_mtx[1]}:rb={flat_mtx[2]}:"
                f"gr={flat_mtx[3]}:gg={flat_mtx[4]}:gb={flat_mtx[5]}:"
                f"br={flat_mtx[6]}:bg={flat_mtx[7]}:bb={flat_mtx[8]}"
            )
            video_filters.append(colorchannelmixer)

        # Color channel mixing:

        if len(video_filters) > 0:
            cmd.extend(["-vf", ",".join(video_filters)])
        # -------------------------

        # Video codec
        if self.codec is not None:
            cmd.extend(["-c:v", self.codec])

        if self.audio_codec is not None:
            cmd.extend(["-c:a", self.audio_codec])

        cmd.extend(["-y", output_file])
        return cmd

class RenderStatus(Enum):
    PENDING = 'PENDING'
    RUNNING = 'RUNNING'
    ERROR = 'ERROR'
    DONE = 'DONE'


class RenderJob:
    _output: str
    _metadata: VideoMetadata
    _settings: RenderSettings
    _status = RenderStatus.PENDING
    _lock = threading.Lock()

    def __init__(self, metadata: VideoMetadata, output_p: str, settings: RenderSettings):
        self._metadata = metadata
        self._output = output_p
        self._settings = settings
        self._status = RenderStatus.PENDING

    def set_status(self, status: RenderStatus):
        with self._lock:
            self._status = status

    def get_status(self):
        with self._lock:
            return self._status

    def get_output_path(self):
        return str(global_var.PROJECT_ROOT)+"/"+self._output+self._settings.container

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

    cmd = render_job._settings.get_ffmpeg_cmd(input_file=input_file, output_file=output_file)
    print(cmd)
    for part in cmd:
        print(part, end=' ')

    print("")
    result = subprocess.run(cmd, capture_output=True, text=True)
    print(result.returncode)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr}")
    return output_file
