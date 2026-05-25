# 줍줍노트 iOS 앱

SwiftUI로 만든 줍줍노트 앱 초안입니다. 기존 웹/모바일/크롬 확장과 같은 Supabase 테이블(`zzup_clips`)을 사용합니다.

## 지금 들어간 것

- Supabase 이메일/비밀번호 로그인
- 로그인 정보와 토큰 Keychain 저장
- 서버 저장함 새로고침
- 웹홈 탭: 전체/정리 대기/문장 요약과 카드 목록
- 모바일 줍기 탭: 문장, 링크, 이미지, 동영상, 자료 수동 저장
- 줍줍문장 탭: 문장만 보기, 자주 보는 문장 필터
- 줍줍사진 탭: 이미지/동영상 카드 보기
- 상세 화면: 제목, 출처, 주운 글, 이유, 연결/확장, 상태, 별표 수정 및 삭제

## 여는 방법

1. Xcode를 설치합니다.
2. 아래 파일을 엽니다.

```text
ios/ZZupZZupNote/ZZupZZupNote.xcodeproj
```

3. Xcode 왼쪽 상단에서 실행 대상을 iPhone 시뮬레이터 또는 연결된 iPhone으로 선택합니다.
4. `ZZupZZupNote` 타겟을 선택하고 `Signing & Capabilities`에서 본인의 Team을 선택합니다.
5. 실행 버튼을 누릅니다.

## 로그인

앱 안에서 Supabase Auth에 등록한 이메일/비밀번호로 로그인합니다.

Supabase URL과 anon key는 현재 웹 버전과 같은 기본값이 앱 안에 들어 있습니다.

```swift
ios/ZZupZZupNote/ZZupZZupNote/Services/AppConfig.swift
```

## 다음 단계

앱으로 계속 키우려면 아래 순서가 좋습니다.

1. Share Extension 추가: Safari, YouTube, 사진 앱에서 공유 버튼으로 바로 줍줍
2. 이미지 파일 업로드: PhotosPicker로 사진 선택 후 `zzup-images` Storage에 업로드
3. 링크 메타데이터 가져오기: 공유된 URL의 제목/사이트명 자동 채우기
4. 줍줍사진 핀 기능 이식
5. TestFlight 배포

## 참고

이 앱은 외부 Swift 패키지를 쓰지 않고 Supabase REST API를 직접 호출합니다. 그래서 처음 Xcode에서 열고 실행할 때 패키지 설치 과정이 없습니다.
