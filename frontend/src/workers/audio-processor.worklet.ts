/**
 * AudioWorklet Processor for Voice Audio
 * Modern replacement for deprecated ScriptProcessorNode
 * Processes audio in a separate thread for better performance
 */

// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./audio-worklet.d.ts" />

class AudioProcessor extends AudioWorkletProcessor {
  /**
   * Process audio input and send Float32 data to main thread
   * @param inputs - Audio input buffers
   * @param outputs - Audio output buffers (unused)
   * @param parameters - Processing parameters (unused)
   * @returns true to keep processor alive
   */
  override process(
    inputs: Float32Array[][],
    _outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const input = inputs[0];
    if (input?.[0]?.length && input[0].length > 0) {
      // Clone the Float32 data and send to main thread
      // The main thread can convert to Int16 if needed
      const dataCopy = new Float32Array(input[0]);
      this.port.postMessage(dataCopy.buffer, [dataCopy.buffer]);
    }
    return true;
  }
}

registerProcessor('audio-processor', AudioProcessor);
