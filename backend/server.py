"""Flask server for the Strands agent web interface."""

import json
import asyncio
from flask import Flask, request, jsonify, Response
from flask_cors import CORS

from config import Config
from agent_manager import agent_manager

app = Flask(__name__)

# Configure CORS
CORS(app, origins=Config.CORS_ORIGINS, supports_credentials=True)


def sse_format(data: dict) -> str:
    """Format data as Server-Sent Event."""
    return f"data: {json.dumps(data)}\n\n"


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({'status': 'healthy', 'service': 'strands-agent-api'}), 200


@app.route('/api/sessions', methods=['GET'])
def list_sessions():
    """List all active sessions."""
    sessions = agent_manager.list_sessions()
    return jsonify({'sessions': sessions}), 200


@app.route('/api/sessions', methods=['POST'])
def create_session():
    """Create a new chat session."""
    try:
        session_id = agent_manager.create_session()
        return jsonify({'session_id': session_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/sessions/<session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a chat session."""
    success = agent_manager.delete_session(session_id)
    if success:
        return jsonify({'message': 'Session deleted'}), 200
    else:
        return jsonify({'error': 'Session not found'}), 404


@app.route('/api/sessions/<session_id>/history', methods=['GET'])
def get_history(session_id):
    """Get conversation history for a session."""
    history = agent_manager.get_history(session_id)
    if history is None:
        return jsonify({'error': 'Session not found'}), 404
    return jsonify({'messages': history}), 200


@app.route('/api/chat', methods=['POST'])
def chat():
    """
    Send a message to the agent and stream the response.

    Request body:
    {
        "session_id": "uuid",
        "message": "user message"
    }

    Response: Server-Sent Events stream
    """
    data = request.get_json()

    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    session_id = data.get('session_id')
    user_message = data.get('message')

    if not session_id or not user_message:
        return jsonify({'error': 'session_id and message are required'}), 400

    # Validate session exists
    session = agent_manager.get_session(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    def generate():
        """Generator function for SSE stream."""
        # Create event loop for async streaming
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

        try:
            # Stream the agent response
            async def stream():
                async for event in agent_manager.stream_response(session_id, user_message):
                    yield sse_format(event)

            # Run the async generator
            gen = stream()
            while True:
                try:
                    event = loop.run_until_complete(gen.__anext__())
                    yield event
                except StopAsyncIteration:
                    break

        except Exception as e:
            error_event = sse_format({
                'type': 'error',
                'message': f'Streaming error: {str(e)}'
            })
            yield error_event

        finally:
            loop.close()

    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )


@app.route('/api/sessions/<session_id>/clear', methods=['POST'])
def clear_history(session_id):
    """Clear conversation history for a session (keeps the session alive)."""
    session = agent_manager.get_session(session_id)
    if not session:
        return jsonify({'error': 'Session not found'}), 404

    session.messages.clear()
    return jsonify({'message': 'History cleared'}), 200


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
