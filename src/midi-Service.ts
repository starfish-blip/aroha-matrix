export interface MidiControlCallback {
  (controlNumber: number, value: number, normalized: number): void;
}

export class MidiService {
  private midiAccess: WebMidi.MIDIAccess | null = null;
  private listeners: Map<number, MidiControlCallback[]> = new Map();
  private activeDeviceName: string = 'None';

  async initialize(): Promise<boolean> {
    if (!navigator.requestMIDIAccess) {
      console.warn('Web MIDI API is not supported in this browser environment.');
      return false;
    }

    try {
      this.midiAccess = await navigator.requestMIDIAccess();
      this.setupInputs();
      
      this.midiAccess.onstatechange = (e) => {
        console.log(`[MIDI State Change] ${e.port.name} (${e.port.type}) is now ${e.port.state}`);
        this.setupInputs();
      };

      return true;
    } catch (err) {
      console.error('Failed to initialize Web MIDI access:', err);
      return false;
    }
  }

  private setupInputs() {
    if (!this.midiAccess) return;

    const inputs = this.midiAccess.inputs.values();
    for (let input of inputs) {
      this.activeDeviceName = input.name || 'Unknown MIDI Device';
      console.log(`[MIDI Connected] Listening to input: ${this.activeDeviceName}`);
      input.onmidimessage = this.handleMidiMessage.bind(this);
    }
  }

  private handleMidiMessage(event: WebMidi.MIDIMessageEvent) {
    const [status, data1, data2] = event.data;
    const messageType = status & 0xf0;

    // Control Change (CC) messages (status byte 176-191 on channel 1-16)
    if (messageType === 0xb0) {
      const ccNumber = data1;
      const rawValue = data2;
      const normalized = rawValue / 127.0;

      const callbacks = this.listeners.get(ccNumber);
      if (callbacks) {
        callbacks.forEach(cb => cb(ccNumber, rawValue, normalized));
      }
    }
  }

  public onControlChange(ccNumber: number, callback: MidiControlCallback) {
    if (!this.listeners.has(ccNumber)) {
      this.listeners.set(ccNumber, []);
    }
    this.listeners.get(ccNumber)!.push(callback);
  }

  public getActiveDeviceName(): string {
    return this.activeDeviceName;
  }
}

export const midiService = new MidiService();