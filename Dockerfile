FROM ubuntu:24.04

RUN apt-get update && \
    apt-get install -y \
    build-essential \
    cmake \
    git \
    ca-certificates \
    libsqlite3-dev \
    libssl-dev \
    libboost-all-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY . .

RUN rm -rf Backend/build && \
    cmake -S Backend -B Backend/build -DCMAKE_BUILD_TYPE=Release && \
    cmake --build Backend/build --config Release

EXPOSE 10000

CMD ["./Backend/build/ecotrade_server"]