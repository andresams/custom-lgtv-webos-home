#!/usr/bin/env python3
# Cliente Telnet mínimo p/ rodar UM comando no shell root da TV (HBChannel telnetd).
# Uso: python3 tvtelnet.py "<comando>"   [ip]  [segundos_espera]
import socket, sys, time, select

TV   = sys.argv[2] if len(sys.argv) > 2 else "192.168.15.118"
WAIT = float(sys.argv[3]) if len(sys.argv) > 3 else 4.0
CMD  = sys.argv[1] if len(sys.argv) > 1 else "id"
IAC, DONT, DO, WONT, WILL = 255, 254, 253, 252, 251

s = socket.create_connection((TV, 23), timeout=12)

def pump(t):
    out = b""
    end = time.time() + t
    while time.time() < end:
        r, _, _ = select.select([s], [], [], 0.25)
        if not r:
            continue
        data = s.recv(4096)
        if not data:
            break
        i, clean, resp = 0, b"", b""
        while i < len(data):
            b = data[i]
            if b == IAC and i + 2 < len(data):
                c, opt = data[i+1], data[i+2]
                if c == DO:   resp += bytes([IAC, WONT, opt])
                elif c == WILL: resp += bytes([IAC, DONT, opt])
                i += 3; continue
            clean += bytes([b]); i += 1
        if resp:
            s.sendall(resp)
        out += clean
        end = time.time() + t
    return out

pump(1.5)                                   # negociação inicial / prompt
# marcadores p/ delimitar a saída
s.sendall(b"echo __BEGIN__\n")
s.sendall((CMD + "\n").encode())
s.sendall(b"echo __END__\n")
out = pump(WAIT).decode(errors="replace")
s.close()

if "__BEGIN__" in out and "__END__" in out:
    out = out.split("__BEGIN__", 1)[1].split("__END__", 1)[0]
sys.stdout.write(out.strip("\r\n") + "\n")
