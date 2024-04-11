class CohereAdapter {
  prepare_request_body(chatml) { return chatml_to_cohere(chatml); }
  get_message_content(json) { return json.text; }
  // note: OFF because streamer sends all chunks in one go
  get_text_chunk_from_stream(event) {
    if(!this.last_line_index) this.last_line_index = 0;
    clearTimeout(this.last_line_timeout);
    this.last_line_timeout = setTimeout(() => {
        this.last_line_index = 0;
    }, 10000);
    const data = event.source.xhr.responseText;
    // split by newline and get last
    const lines = data.split('\n').slice(this.last_line_index);
    console.log(lines);
    this.last_line_index += lines.length;
    const text_chunk = lines
        .filter((line) => line.trim() !== '')
        .map((line) => {
            console.log(line);
            const json = JSON.parse(line);
            if(json.event_type === 'stream-end') {
                console.log('stream-end');
                this.end_of_stream = true;
                setTimeout(() => {
                    this.end_of_stream = false;
                }, 3000);
                return '';
            }
            return json.text;
        })
        .join('');
    console.log(text_chunk);
    return text_chunk;
  }
  is_end_of_stream(event) { return this.end_of_stream; }
}
exports.CohereAdapter = CohereAdapter;

function chatml_to_cohere(chatml) {
    const cohere = {
        model: chatml.model,
        // skip last user message
        chat_history: chatml.messages.slice(0, -1).map((message) => ({
            role: message.role,
            message: message.content,
        })),
        message: chatml.messages[chatml.messages.length - 1].content,
        temperature: chatml.temperature,
        // stream: chatml.stream // currently not supported
    };
    return cohere;
}
exports.chatml_to_cohere = chatml_to_cohere;

