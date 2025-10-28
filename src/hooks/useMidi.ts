import { useState, useEffect, useCallback, useRef } from 'react';

export interface MidiCCMessage {
  type: 'cc';
  channel: number; // 1-16
  controller: number;
  value: number; // 0-127
}

export interface MidiNoteMessage {
  type: 'note';
  channel: number; // 1-16
  note: number;
  velocity: number; // 0-127
  on: boolean; // true for Note On, false for Note Off
}

export type MidiMessage = MidiCCMessage | MidiNoteMessage;

export interface UseMidiReturn {
  isConnected: boolean;
  error: string | null;
  lastMessage: MidiMessage | null;
  requestMidiAccess: () => Promise<void>;
  onMidiMessage: (callback: (message: MidiMessage) => void) => void;
}

export function useMidi(): UseMidiReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastMessage, setLastMessage] = useState<MidiMessage | null>(null);
  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const callbacksRef = useRef<Set<(message: MidiMessage) => void>>(new Set());

  const parseMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const data1 = data[1];
    const data2 = data[2];
    const messageType = status & 0xf0; // Get message type (high nibble)
    const channel = (status & 0x0f) + 1; // Get channel (low nibble), convert 0-15 to 1-16

    let message: MidiMessage | null = null;

    // Control Change (0xB0)
    if (messageType === 0xb0) {
      message = {
        type: 'cc',
        channel,
        controller: data1,
        value: data2
      };
    }
    // Note On (0x90) or Note Off (0x80)
    else if (messageType === 0x90 || messageType === 0x80) {
      // Note On with velocity 0 is also a Note Off
      const isNoteOn = messageType === 0x90 && data2 > 0;
      message = {
        type: 'note',
        channel,
        note: data1,
        velocity: data2,
        on: isNoteOn
      };
    }

    if (message) {
      setLastMessage(message);

      // Log to console for easy debugging
      if (message.type === 'cc') {
        console.log(`[MIDI] Channel ${message.channel} | CC #${message.controller}: ${message.value}`);
      } else if (message.type === 'note') {
        console.log(`[MIDI] Channel ${message.channel} | Note #${message.note}: velocity ${message.velocity} (${message.on ? 'ON' : 'OFF'})`);
      }

      // Notify all registered callbacks
      callbacksRef.current.forEach(callback => callback(message));
    }
  }, []);

  const requestMidiAccess = useCallback(async () => {
    if (!navigator.requestMIDIAccess) {
      setError('Web MIDI API not supported in this browser');
      return;
    }

    try {
      setError(null);
      const access = await navigator.requestMIDIAccess();
      midiAccessRef.current = access;

      // Connect to the first available input device
      const inputs = Array.from(access.inputs.values());

      if (inputs.length === 0) {
        setError('No MIDI devices found');
        setIsConnected(false);
        return;
      }

      // Connect to all MIDI inputs (in case user has multiple devices)
      console.log(`[MIDI] Found ${inputs.length} MIDI device(s):`);
      inputs.forEach((input, index) => {
        console.log(`  ${index + 1}. ${input.name || 'Unnamed device'} (${input.manufacturer || 'Unknown manufacturer'})`);
        input.onmidimessage = parseMidiMessage;
      });
      console.log('[MIDI] ✓ Connected! Listening for CC and Note messages...');

      setIsConnected(true);
      setError(null);

      // Listen for device connections/disconnections
      access.onstatechange = (event) => {
        const port = event.port as MIDIInput;
        if (port.type === 'input') {
          if (port.state === 'connected') {
            port.onmidimessage = parseMidiMessage;
          }
        }

        // Check if any inputs are still connected
        const currentInputs = Array.from(access.inputs.values());
        setIsConnected(currentInputs.some(input => input.state === 'connected'));
      };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access MIDI devices');
      setIsConnected(false);
    }
  }, [parseMidiMessage]);

  const onMidiMessage = useCallback((callback: (message: MidiMessage) => void) => {
    callbacksRef.current.add(callback);

    // Return cleanup function
    return () => {
      callbacksRef.current.delete(callback);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (midiAccessRef.current) {
        const inputs = Array.from(midiAccessRef.current.inputs.values());
        inputs.forEach(input => {
          input.onmidimessage = null;
        });
      }
    };
  }, []);

  return {
    isConnected,
    error,
    lastMessage,
    requestMidiAccess,
    onMidiMessage
  };
}

