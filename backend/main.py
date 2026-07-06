print("Hello world! :)")

from dataclasses import asdict

from flask import Flask, jsonify, request

from video_metadata import VideoMetadata
app = Flask(__name__)

CURRENT_VIDEO: VideoMetadata | None = None



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
    
    metadata.download_thumbnail()
    
    CURRENT_VIDEO = metadata
    return jsonify(
        {
            "metadata" : asdict(CURRENT_VIDEO)
        }
    ), 201


if __name__ == '__main__':
    app.run(debug=True)