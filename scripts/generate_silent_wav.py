import struct

sample_rate = 44100
duration = 10  # seconds
num_channels = 1  # mono
bits_per_sample = 16

num_samples = sample_rate * duration
byte_rate = sample_rate * num_channels * bits_per_sample // 8
block_align = num_channels * bits_per_sample // 8
data_size = num_samples * block_align
file_size = 36 + data_size

# WAV Header
header = b'RIFF' + struct.pack('<I', file_size) + b'WAVE'
header += b'fmt ' + struct.pack('<I', 16) + struct.pack('<H', 1) + struct.pack('<H', num_channels)
header += struct.pack('<I', sample_rate) + struct.pack('<I', byte_rate) + struct.pack('<H', block_align)
header += struct.pack('<H', bits_per_sample)
header += b'data' + struct.pack('<I', data_size)

# Fill with very low noise (1) instead of pure silence (0)
# iOS optimizations sometimes suspend audio hardware on pure 0 streams.
# 1/65536 is inaudible but keeps the channel active.
data = b'\x01' * data_size

with open('public/silent.wav', 'wb') as f:
    f.write(header)
    f.write(data)

print(f"Generated public/silent.wav ({duration}s)")
