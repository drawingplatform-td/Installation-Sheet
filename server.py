from inspection_app import create_app


app = create_app()


if __name__ == "__main__":
    import socket

    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)

    print("Server running at:")
    print("   - Local: http://localhost:5000")
    print(f"   - Network: http://{local_ip}:5000")
    print("   - All interfaces: 0.0.0.0:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)
