# 줍줍노트 Safari 확장 준비

이 폴더는 Chrome 확장인 `extension/`을 Safari Web Extension Xcode 프로젝트로 패키징하기 위한 자리입니다.

## 현재 상태

현재 작업 환경은 Xcode 전체가 아니라 Command Line Tools만 설치되어 있어서 Safari Web Extension packager를 실행할 수 없습니다.

확인된 상태:

```text
xcode-select: /Library/Developer/CommandLineTools
safari-web-extension-packager: 없음
```

## Xcode 설치 후 실행

Xcode를 설치하고 처음 실행 설정을 끝낸 뒤, 프로젝트 루트에서 아래 명령을 실행합니다.

```sh
node tools/package_safari_extension.mjs
```

스크립트는 다음과 같은 Xcode 프로젝트를 생성합니다.

```text
safari/
  줍줍노트.xcodeproj
  ...
```

내부적으로 실행하는 명령은 이 형태입니다.

```sh
xcrun safari-web-extension-packager extension \
  --project-location safari \
  --app-name "줍줍노트" \
  --bundle-identifier com.zzupzzupnote.app \
  --swift
```

## Mac Safari 테스트

1. 생성된 Xcode 프로젝트를 엽니다.
2. Signing & Capabilities에서 Apple Developer Team을 선택합니다.
3. macOS 앱 타깃을 실행합니다.
4. Safari > 설정 > 확장 프로그램에서 줍줍노트를 켭니다.
5. 확장 설정에서 CSV 저장 폴더를 선택합니다.

## iPhone/iPad 방향

iOS/iPadOS Safari 확장도 같은 방식으로 앱에 포함할 수 있습니다. 다만 iPhone/iPad에서는 로컬 CSV와 images 폴더에 직접 쓰는 경험이 데스크톱보다 제약이 있으므로, 첫 버전은 Mac Safari 확장을 먼저 안정화하고 이후에 iOS 앱/공유 시트 저장 흐름을 붙이는 편이 좋습니다.

추천 순서:

1. Mac Safari 확장 변환 및 테스트
2. iOS/iPadOS 타깃 추가
3. 공유 시트 또는 앱 저장소를 통한 CSV/images 저장 구현
4. App Store 또는 TestFlight 배포
