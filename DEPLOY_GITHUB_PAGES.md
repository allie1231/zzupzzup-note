# 줍줍노트 GitHub Pages 배포

줍줍노트는 정적 파일만으로 동작하므로 GitHub Pages에 그대로 올릴 수 있습니다.

배포 후 주소는 보통 아래 형태가 됩니다.

```text
https://깃허브아이디.github.io/저장소이름/
```

예를 들어 저장소 이름이 `zzupzzup-note`라면:

```text
https://깃허브아이디.github.io/zzupzzup-note/
```

## 열리는 화면

루트 주소:

```text
https://깃허브아이디.github.io/저장소이름/
```

웹홈:

```text
https://깃허브아이디.github.io/저장소이름/web/
```

모바일 줍기:

```text
https://깃허브아이디.github.io/저장소이름/mobile-pwa/
```

## 중요한 보안 메모

GitHub Pages에는 앱 코드만 올라갑니다.

올라가지 않는 것:

- `줍줍노트.csv`
- `images/` 폴더
- 개인 수집 데이터
- 브라우저 로컬 저장소 내용

즉 다른 사람이 사이트 주소를 알아도, 그 사람에게는 그 사람의 빈 줍줍노트가 열립니다. 내 CSV를 직접 공유하지 않는 한 내 수집물은 보이지 않습니다.

## 가장 쉬운 배포 방법

1. GitHub에서 새 저장소를 만듭니다.
2. 저장소 이름 예시: `zzupzzup-note`
3. 이 프로젝트 파일 전체를 저장소에 올립니다.
4. GitHub 저장소에서 `Settings`로 이동합니다.
5. 왼쪽 메뉴에서 `Pages`를 누릅니다.
6. `Build and deployment`에서 `Source`를 `Deploy from a branch`로 선택합니다.
7. Branch는 `main`, Folder는 `/(root)`로 선택합니다.
8. `Save`를 누릅니다.
9. 잠시 기다린 뒤 Pages 주소로 접속합니다.

GitHub 공식 문서에서도 빌드 과정이 필요 없는 정적 사이트는 브랜치와 루트 폴더를 publishing source로 지정하는 방식을 안내합니다.

## 터미널로 올리는 방법

아직 git 저장소가 아니라면:

```sh
cd /Users/allie/Documents/Codex/2026-05-19/new-chat
git init
git add .
git commit -m "Prepare zzupzzup note static site"
git branch -M main
git remote add origin https://github.com/깃허브아이디/저장소이름.git
git push -u origin main
```

이미 git 저장소라면:

```sh
git add .
git commit -m "Prepare GitHub Pages site"
git push
```

## 아이폰/아이패드 단축어 주소

배포 후 단축어에서 열 URL은 아래처럼 바꿉니다.

```text
https://깃허브아이디.github.io/저장소이름/mobile-pwa/?type=링크&url=[인코딩된 URL]&title=[제목]&text=[메모]
```

이제 맥 서버를 켜두지 않아도 아이폰/아이패드에서 모바일 줍줍노트를 열 수 있습니다.
