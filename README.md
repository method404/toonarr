# Toonarr

Toonarr는 웹툰 수집과 라이브러리 관리를 목표로 하는 개인용 관리자 UI입니다. 개인 서버 환경을 기준으로 설계하였습니다.

## ✨ 특징

- 웹툰 검색, 요일별 탐색, 완결무료 탐색을 한 화면 흐름으로 관리할 수 있습니다.
- 라이브러리, 상세 정보, 회차 상태를 한눈에 확인할 수 있습니다.
- 시리즈 메타데이터와 회차 파일을 로컬 경로에 정리해서 저장할 수 있습니다.
- Docker와 NAS 환경을 염두에 두고 데이터 경로를 분리해 운용할 수 있습니다.
- Sonarr 계열 UI 흐름을 참고해 익숙한 방식으로 관리할 수 있습니다.

## 🖼 스크린샷

![스크린샷 1](./screenshots/1.png)
![스크린샷 2](./screenshots/2.png)
![스크린샷 3](./screenshots/3.png)
![스크린샷 4](./screenshots/4.png)

## 📦 설치 방법

필요 환경:

- Node.js 22 이상
- npm
- Playwright 실행 환경
- Docker Engine
- Docker Compose
- 영구 저장용 볼륨 또는 바인드 마운트

로컬 실행:

```bash
bash -lc 'git clone https://github.com/method404/toonarr.git && cd toonarr && npm install && npx playwright install && npm run dev'
```

접속 주소: [http://localhost:3000](http://localhost:3000)

Docker 실행:

```bash
bash -lc 'git clone https://github.com/method404/toonarr.git && cd toonarr && docker compose up --build'
```

기본 구성:

- 포트: `3000:3000`
- 데이터 경로: `/app/data`

NAS에서 운용할 때는 named volume 대신 바인드 마운트 사용을 권장합니다.

```yaml
services:
  toonarr:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
    volumes:
      - /volume1/docker/toonarr/data:/app/data
    restart: unless-stopped
```

## ⚠️ 주의사항

개인 저장 및 개인 열람 목적을 전제로 합니다. 수집한 웹툰 파일이나 메타데이터를 재배포, 공유, 판매, 공개 업로드하는 용도로 사용하지 마십시오.

무단 공유 및 네이버 약관 위반으로 발생하는 문제는 사용자 책임입니다. 절대 개인목적으로만 사용하시길 바랍니다. 프로젝트 제공자는 사용 결과를 보증하지 않습니다.

## 📄 라이선스

이 프로젝트는 [MIT License](./LICENSE)를 따릅니다.
