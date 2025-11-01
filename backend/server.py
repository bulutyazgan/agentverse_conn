"""Flask server for the Strands agent web interface."""

import json
import asyncio
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

from config import Config
from agent_manager import agent_manager

app = Flask(__name__)

# Configure CORS
CORS(app, resources={r"/api/*": {"origins": Config.CORS_ORIGINS}}, supports_credentials=True)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'message_count': len(agent_manager.messages)
    }), 200


@app.route('/api/history', methods=['GET'])
def get_history():
    """Get conversation history."""
    try:
        messages = agent_manager.get_messages()
        return jsonify({
            'messages': messages
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/clear', methods=['POST'])
def clear_history():
    """Clear conversation history."""
    try:
        agent_manager.clear_history()
        return jsonify({'message': 'History cleared'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/chat', methods=['POST'])
def chat():
    """Send a message and stream the response."""
    try:
        data = request.get_json()
        message = data.get('message')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        def generate():
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            
            async def stream():
                async for event in agent_manager.stream_response(message):
                    yield f"data: {json.dumps(event)}\n\n"
            
            try:
                gen = stream()
                while True:
                    try:
                        chunk = loop.run_until_complete(gen.__anext__())
                        yield chunk
                    except StopAsyncIteration:
                        break
            finally:
                loop.close()
        
        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.errorhandler(404)
def not_found(e):
    """Handle 404 errors."""
    return jsonify({'error': 'Not found'}), 404


@app.errorhandler(500)
def internal_error(e):
    """Handle 500 errors."""
    return jsonify({'error': 'Internal server error'}), 500


if __name__ == '__main__':
    print(f"Starting Flask server...")
    print(f"Ollama host: {Config.OLLAMA_HOST}")
    print(f"Ollama model: {Config.OLLAMA_MODEL}")
    print(f"CORS origins: {Config.CORS_ORIGINS}")
    print(f"\nServer running on http://localhost:5001")

    app.run(
        host='0.0.0.0',
        port=5001,
        debug=Config.DEBUG,
        threaded=True
    )
