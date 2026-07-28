# Open Lecture Hub

YouTube와 공식 공개 채널에 흩어진 오픈 강의를 주제별로 정리하는 정적 웹사이트입니다.

## 파일 구조

```text
OpenLectureHub/
├── index.html
├── style.css
├── script.js
├── lectures.json
└── README.md
```

## 실행 방법

`fetch()`로 `lectures.json`을 읽기 때문에 `index.html`을 직접 더블클릭하기보다 로컬 서버에서 실행해야 합니다.

### Python

```bash
cd OpenLectureHub
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000`을 여세요.

### VS Code

Live Server 확장 기능으로 `index.html`을 실행해도 됩니다.

## GitHub Pages 배포

1. GitHub 저장소에 파일들을 업로드합니다.
2. 저장소의 **Settings → Pages**로 이동합니다.
3. `Deploy from a branch`를 선택합니다.
4. `main` 브랜치와 `/root`를 선택한 뒤 저장합니다.

## 강의 추가

`lectures.json`의 `lectures` 배열 안에 아래 형식으로 추가합니다.

```json
{
  "id": "unique-course-id",
  "title": "강의 제목",
  "provider": "학교 또는 기관",
  "instructor": "교수자 또는 강연자",
  "category": "Artificial Intelligence",
  "level": "중급",
  "language": "영어",
  "description": "강의에 대한 짧고 중립적인 설명",
  "videoId": "유튜브 영상 ID",
  "playlistId": "재생목록 ID 또는 빈 문자열",
  "type": "Course",
  "tags": ["AI", "Machine Learning"],
  "featured": 10,
  "addedAt": "2026-07-28"
}
```

예를 들어 URL이 아래와 같다면:

```text
https://www.youtube.com/watch?v=ABC123XYZ&list=PL123456
```

- `videoId`: `ABC123XYZ`
- `playlistId`: `PL123456`

## 운영 시 권장 사항

- 공식 채널 또는 권리자가 공개한 영상인지 확인합니다.
- 영상을 다운로드하거나 재업로드하지 않고 원본 URL과 임베드만 사용합니다.
- 강의 제목, 기관, 교수자, 설명을 사실에 맞게 적습니다.
- 삭제·수정 요청을 받을 수 있는 연락 방법을 사이트에 추가하는 편이 좋습니다.
- `lectures.json`의 예시 항목은 실제 공개 강의 정보로 교체해 주세요.
