from dataclasses import dataclass
import json
from flask import jsonify
import httpx
import yt_dlp
import global_var

@dataclass
class VideoMetadata:
    site: str
    url: str
    name: str
    desc: str
    thumbnail_url: str
    
    length: float
    framerate: str
    res: str
    encoding: str

    @staticmethod
    def _get_site(url: str) -> str:
        #TODO: more site support
        return "youtube"

    @staticmethod
    def from_url(url: str):
        #TODO: implement more sites
        site = VideoMetadata._get_site(url)
        
        match site:
            case "youtube":  
                return VideoMetadata.from_yt(url)
            case _:
                return None
    @staticmethod
    def from_yt(url: str):
        ydl_opts = {'quiet': True}
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)

        best_format = max(
            (f for f in info['formats'] if f.get('vcodec') != 'none'),
            key=lambda f: f.get('height') or 0,
            default=None
        )

        if best_format is None:
            raise ValueError(f"No suitable video format found for {url}")

        v_data = VideoMetadata(
            site="youtube",
            url=url,
            name=info.get('title'),
            desc=info.get('description'),
            thumbnail_url=info.get('thumbnail'),
            length=float(info.get('duration', 0)),
            framerate=f"{best_format.get('fps')}fps",
            res=best_format.get('resolution'),
            encoding=best_format.get('vcodec'),
        )

        return v_data
        
    def download_thumbnail(self):
        with httpx.Client() as client:
            response = client.get(self.thumbnail_url, follow_redirects=True)
            response.raise_for_status()

            with open(str(global_var.PROJECT_ROOT)+"/frontend/public/temp/thumbnail.jpeg", "wb") as f:
                f.write(response.content)
                
    def download_video(self):
        ydl_opts = {
                'format': 'bestvideo+bestaudio/best',
                'outtmpl': 'temp_video_files/video.%(ext)s',
                'quiet': False
            }
        
        #Letting the library combine audio and video streams to the best format it can
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(self.url, download=True)
            if 'requested_downloads' in info and info['requested_downloads']:
                filename = info['requested_downloads'][0]['filepath']
            else:
                filename = ydl.prepare_filename(info)
            
        return filename