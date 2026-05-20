# 아이폰/아이패드에서 줍줍노트 쓰기

iOS/iPadOS의 Chrome은 데스크톱 Chrome 확장프로그램을 지원하지 않습니다. 그래서 줍줍노트 모바일은 아래 조합으로 구현합니다.

```text
공유 버튼 -> iOS 단축어 -> 줍줍노트 모바일 웹폼 -> CSV 내보내기 -> 데스크톱 웹홈에서 정리
```

## 1. 모바일 웹홈 열기

배포된 모바일 주소를 Safari 또는 Chrome에서 엽니다.

```text
https://your-domain.example/mobile-pwa/
```

로컬 테스트라면 데스크톱에서 서버를 켠 뒤 같은 Wi-Fi의 아이폰/아이패드에서 접속합니다.

```sh
cd /Users/allie/Documents/Codex/2026-05-19/new-chat
python3 -m http.server 4175
```

모바일에서:

```text
http://맥의-로컬-IP:4175/mobile-pwa/
```

## 2. 홈 화면에 추가

Safari에서 모바일 웹홈을 연 뒤:

1. 공유 버튼
2. 홈 화면에 추가
3. 이름을 `줍줍노트`로 저장

이후 홈 화면 앱처럼 열 수 있습니다.

## 3. 단축어 만들기

단축어 앱에서 새 단축어를 만들고 이름을 `줍줍노트에 줍기`로 둡니다.

설정:

- 공유 시트에서 보기: 켬
- 입력 유형: URL, 텍스트, 이미지, Safari 웹 페이지

동작 예시:

1. `단축어 입력 받기`
2. `입력에서 URL 가져오기`
3. `입력에서 이름 가져오기` 또는 `텍스트`로 제목/메모 만들기
4. `URL 인코딩`으로 URL, 제목, 메모를 각각 인코딩
5. `URL 열기`

열 URL 형식:

```text
https://your-domain.example/mobile-pwa/?type=링크&url=[인코딩된 URL]&title=[인코딩된 제목]&text=[인코딩된 메모]
```

이미지 URL을 넘길 수 있는 경우:

```text
https://your-domain.example/mobile-pwa/?type=이미지&url=[페이지 URL]&imageUrl=[이미지 URL]&title=[제목]
```

## 4. 실제 사용 흐름

1. Safari, Chrome, Instagram, YouTube, Files 등에서 공유 버튼을 누릅니다.
2. `줍줍노트에 줍기` 단축어를 누릅니다.
3. 줍줍노트 모바일 웹폼이 열립니다.
4. 유형, 제목, 메모, 별표를 확인합니다.
5. `이 기기에 저장`을 누릅니다.
6. 나중에 `CSV 내보내기`를 눌러 `줍줍노트-mobile-YYYYMM.csv`를 저장합니다.
7. 데스크톱 웹홈에서 그 CSV를 열어 분류/정리합니다.

## 한계

- iOS Chrome 확장프로그램은 만들 수 없습니다.
- PWA가 iOS 공유 시트의 네이티브 대상처럼 직접 뜨는 `Web Share Target`은 iOS Safari에서 안정적으로 지원되지 않습니다.
- 이미지를 파일로 자동 저장하려면 단축어에서 iCloud Drive의 `줍줍노트/images` 폴더에 저장하는 별도 동작을 추가해야 합니다.

그래서 첫 버전은 `단축어로 웹폼 열기 + 모바일 임시 저장 + CSV 내보내기`가 가장 안정적입니다.
