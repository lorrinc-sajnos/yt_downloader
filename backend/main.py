print("Hello world! :)")

from dataclasses import asdict
from pathlib import Path
import subprocess

from flask import Flask, jsonify, request, send_file
import msgspec

import globals
from render import RenderJob, RenderSettings
from video_metadata import VideoMetadata
app = Flask(__name__)



@app.route('/helloworld', methods=['GET'])
def home():
    return jsonify({'data': 'Hello Ana from VTS! :)'})


@app.route('/fetch-video-metadata', methods=['POST'])
def fetch_video():
    data = request.get_json()

    if not data or 'url' not in data:
        return jsonify({'error': 'Missing "url" in request body'}), 400

    url = data['url']
    metadata = VideoMetadata.from_url(url)
    
    if metadata is None:        
        return jsonify({'error': f'Value of "url": {url} couldn\'t be fetched!'}), 400
    
    metadata.download_thumbnail()
    
    globals.CURRENT_VIDEO = metadata
    return jsonify(
        {
            "metadata" : asdict(globals.CURRENT_VIDEO)
        }
    ), 201

OUTPUT_ROOT = "temp_video_files/output"
@app.route('/start-render', methods=['POST'])
def render():
    print(request.data)
    
    if request.is_json:
        settings = msgspec.json.decode(request.data, type=RenderSettings)
    else: 
        print('JSON was expected, deafulting to empty settings!')
        settings = RenderSettings()
    
    globals.CURRENT_RENDER = RenderJob(metadata = globals.CURRENT_VIDEO, output_p=OUTPUT_ROOT, settings = settings)
    
    globals.CURRENT_RENDER.start_render()
    
    return jsonify(
        {
            "msg" : "Render Started!"
        }
    ), 202
    
@app.route('/get-render-status', methods=['GET'])
def get_status():
    if globals.CURRENT_RENDER is None:
        return jsonify(
            {
                "error" : "RenderJob does not yet exsist!"
            }
        ), 400
    
    return jsonify(
        {
            "status" : globals.CURRENT_RENDER.get_status().value
        }
    ), 200


@app.route('/download-video', methods=['GET'])
def donwload_video():
    return send_file(globals.CURRENT_RENDER.get_output_path(), as_attachment=True)

    

if __name__ == '__main__':
    app.run(debug=True)