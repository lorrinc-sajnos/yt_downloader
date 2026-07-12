# YT DOWNLOADER
## Summary
This is a simple webiste, that you can use to download video files from the web, and using **FFMPEG** make alterations to your liking.

This is the 

POST: /fetch-url w json payload:
-it fetches the thumbnail and info about the video

POST: /start-render w json payload
-it starts the rendering with the given arguments (like fps, format etc.)

GET: /render-status
-returns the status of the render [NOVIDEO/PENDING/ONGOING/DONE]

GET: /donwload-video
-returns the renders video

