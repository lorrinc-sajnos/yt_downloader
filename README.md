# YT DOWNLOADER
## Summary
This is a simple webiste, that you can use to download video files from the web, and using **FFMPEG** make alterations to your liking.

## API Documentation
 
Base URL: `http://<host>:<port>/`
 
---
 
### GET `/helloworld`
 
A simple health-check / greeting endpoint.
 
**Request Body:** None
 
**Response:** `200 OK`
```json
{
  "data": "Hello Ana from VTS! :)"
}
```
 
---
 
###  POST ` /fetch-video-metadata`
 
Fetches metadata for a video given its URL, downloads its thumbnail, and stores it as the current active video.
 
**Request Body:**
```json
{
  "url": "https://example.com/video-link"
}
```
 
| Field | Type   | Required | Description                  |
|-------|--------|----------|-------------------------------|
| url   | string | Yes      | URL of the video to fetch     |
 
**Responses:**
 
- `201 Created` — metadata successfully fetched:
```json
  {
    "metadata": { 
        
    }
  }
```
 
- `400 Bad Request` — missing `url` field:
```json
  { "error": "Missing \"url\" in request body" }
```
 
- `400 Bad Request` — metadata could not be fetched from the given URL:
```json
  { "error": "Value of \"url\": <url> couldn't be fetched!" }
```
 
---
 
### POST `/start-render`
 
Starts a render job using the currently stored video metadata (`globals.CURRENT_VIDEO`) and the provided render settings. Output files are written under `temp_video_files/output`.
 
**Request Body:** JSON object matching the `RenderSettings` schema.
- If the request is not JSON, default `RenderSettings()` values are used instead.
**Response:** `202 Accepted`
```json
{
  "msg": "Render Started!"
}
```
 
**Notes:**
- Requires `/fetch-video-metadata` to have been called first.
- Overwrites any previous videos.
---
 
### GET `/get-render-status`
 
Returns the status of the current render job.
 
**Request Body:** None
 
**Responses:**
 
- `200 OK` — render job exists:
```json
  {
    "status": "<render status value>"
  }
```
 
- `400 Bad Request` — no render job has been started yet:
```json
  { "error": "RenderJob does not yet exsist!" }
```
 
**Possible `status` values**:
 
| Value     | Meaning                        |
|-----------|---------------------------------|
| `PENDING` | Render job created, not yet started |
| `RUNNING` | Render is currently in progress |
| `ERROR`   | Render failed                   |
| `DONE`    | Render completed successfully   |
 
---
 
### GET `/download-video`
 
Downloads the rendered video output file as an attachment.
 
**Request Body:** None
 
**Response:** `200 OK` — the file at `globals.CURRENT_RENDER.get_output_path()`, sent as a downloadable attachment.
 
**Notes:**
- Assumes a render job has already been started and completed; no existence check is performed on `globals.CURRENT_RENDER` before calling `get_output_path()`, so calling this before `/start-render` will raise an error.
---
 
## Workflow
 
1. `POST /fetch-video-metadata` — provide a video URL to fetch and store metadata.
2. `POST /start-render` — kick off rendering with optional settings.
3. `GET /get-render-status` — poll until the render completes.
4. `GET /download-video` — download the finished video file.