# 장기 PV 표시 오류 수정 인계

## 다음 Codex에 전달할 요청

이 문서를 읽고 LiGround의 장기 추천 수 표시 문제를 이어서 수정해 주세요. 사용자는 `npm run dev`에서 호버 미리보기의 판과 기물 위치가 여전히 제대로 맞지 않는다고 보고했습니다. 이전 수정과 테스트가 통과했다는 기록만으로 해결됐다고 판단하지 말고, 개발 실행 화면에서 먼저 재현하고 실제 배경 교차점·기물 중심·화살표·번호의 정렬을 확인해 주세요. 빌드 및 설정 파일은 그대로 유지하세요.

현재 사용자는 **인계 문서 작성만 요청한 상태**입니다. 이 문서를 새 환경에서 수정 요청과 함께 전달받으면 아래 작업을 진행하세요.

## 저장소와 기준 코드

- 저장소: https://github.com/waintman/liground
- 작업 브랜치: `codex/0.6.0-vue3`
- 이 문서 작성 직전 코드 HEAD: `79e929b`
- 환경: Vue 3, Vuex 4, Electron 35, ChessgroundX, ffish, Fairy-Stockfish Largeboard.
- 기존 환경은 macOS였지만 새 환경의 OS·화면 배율·창 크기는 확인 필요.
- README 기준 Node.js 22.12 이상. 기존 설치/실행 절차는 README와 package.json을 확인.
- 아래 수정 커밋은 이전 작업에서 로컬 커밋했으며 **push하지 않았다**. 새 환경에서 브랜치 이름만 같다고 최신 코드라고 가정하지 말 것.

```sh
git status --short
git branch --show-current
git log -6 --oneline
git show --stat 79e929b
```

`79e929b`가 없다면 기존 작업 환경에서 해당 브랜치/커밋 또는 패치를 전달받아야 한다. 이미 다른 변경이 있으면 보존하며 병합한다. 사용자 로컬 설정과 기존 작업을 삭제하거나 덮어쓰지 않는다.

## 사용자 요구와 제약

1. `ys_edit`의 UI/일부 기능을 현재 Vue 3 브랜치에 반영하되 빌드·설정 파일은 유지.
2. Fairy-Stockfish의 좌표 텍스트만으로는 수순이 읽기 어려우므로, 장기판에 실시간 추천 수순을 시각화.
3. 추천 수를 호버하면 해당 수순을 확인하고, 마우스를 움직이지 않아도 엔진 분석 변화가 반영되어야 함.
4. 화살표에 `1, 2, 3…` 번호를 붙여 순서를 명확하게 표시.
5. 호버 미리보기의 판과 기물이 정확히 정렬되어야 함.
6. 미리보기는 실제 기보와 현재 FEN을 변경하지 않아야 함.

package.json, package-lock.json, webpack/, electron-builder.json, 빌드 스크립트 및 관련 설정을 변경하는 방식으로 해결하지 말 것. 의존성 변경 없이 기존 Vue/ChessgroundX 구조에서 원인을 찾아 수정한다.

## 변경 이력

### `9bacd3f` — ys_edit UI 복원

`ys_edit`는 이미 현재 브랜치의 조상이라 일반 merge는 효과가 없었다. 이후 0.6.0 병합에서 달라진 UI를 선택적으로 복원했다.

- 왼쪽 PGN 목록/스타일 선택기, 보드 아래 PV, 오른쪽 이동 버튼.
- 첫 엔진의 PVLines를 Vue Teleport로 `#pv-lines`에 이동. 추가 엔진은 각 패널에 유지.
- 보드 배경의 `.rotate180` 및 내부 `.orientation-black` 역회전 복원.
- EngineConsole의 제거된 scroller에 대한 null 접근 방어.

### `d36bffc` — 실시간 PV

- `sender.js`: PV가 실제로 들어온 메시지만 수순으로 전달. MultiPV 생략 시 1로 처리. 통계 메시지가 대기 중인 PV를 덮지 않도록 수정.
- `store.js`: 더 깊은 캐시가 새 실시간 PV를 차단하던 조건 제거. 늦은 캐시 응답이 실시간 PV를 덮지 않도록 방어.
- `pvShapes.js`: UCI 수순을 최대 6수 화살표로 변환. 첫 수 노랑, 상대 응수 빨강, 후속 수 초록. 10행 좌표는 Chessground의 `:` 표기로 변환. 한수쉼은 원.
- `ChessGround.vue`: 기본 최선 수순을 상시 표시하고, 호버 시 해당 엔진/수순을 선택.
- `PVLines.vue`: 새 분석 도착 시 호버 미리보기 재계산. `hoveredPvLine`에 엔진·FEN·수순·선택 수 수를 저장.

### `79e929b` — 미리보기 비율과 번호

- 미리보기의 기존 160×160 고정 크기를 장기에서 180×200으로 변경.
- 미리보기 배경을 `background-size: 100% 100%`로 표시하고 기물 영역을 부모 크기에 맞춤.
- 미리보기에도 흑 시점의 부모 회전을 적용하고, 내부 역회전 CSS를 `.cg-board-wrap.rotate180 > .orientation-black`으로 제한.
- 미리보기 애니메이션/드래그/선택 비활성화.
- `pvShapes`에 order 추가. `pvLabels`가 화살표 중간 부근의 백분율 위치를 계산.
- 메인 보드에 별도 HTML 번호 오버레이 추가. 흑 시점에 역회전. 같은 위치의 반복 번호는 조금씩 이동.

**이 커밋 이후에도 사용자가 “아직도 제대로 표시되지 않아”라고 보고했다. 미해결 상태다.** 마지막 보고에는 어느 시점·스타일·크기에서 어떤 요소가 어긋나는지 추가 설명이나 스크린샷이 없다. 비율만이 원인이라고 확정하지 말 것.

## 우선 읽을 파일

- `src/renderer/components/PVLines.vue`
  - 미리보기 템플릿, previewSize, ensurePreviewBoard, refreshPreview, updatePreviewPosition, 관련 scoped CSS.
- `src/renderer/components/ChessGround.vue`
  - 보드 래퍼/회전, updateEngineShapes, pvMoveLabels, 번호 오버레이, 크기 조절, 전역 CSS.
- `src/renderer/engine/pvShapes.js`
  - 좌표 변환, 화살표 순서, 번호 위치/겹침 처리.
- `src/renderer/assets/chessground.css`, `dim9x10.css`, `dim9x9.css`, `dim8x8.css`
  - cg-helper → cg-container → cg-board의 중첩 크기와 piece 크기/위치.
- `static/board-css/xiangqi/{janggi,janggimodern,janggicasual}/`
  - 선택 스타일에 따른 background-size, 래퍼 크기, 패딩 차이.
- `static/board/svg/`, `static/piece-css/xiangqi/`
  - 실제 판 이미지의 교차점/여백, 기물 이미지 내부 여백.
- `src/renderer/components/AnalysisContainer.vue`, `GameBoards.vue`
  - Teleport 대상, 레이아웃, 스크롤/overflow.
- `src/renderer/store.js`, `src/renderer/engine/sender.js`, `driver.js`
  - 분석 갱신 및 호버 선택 상태.

설치된 ChessgroundX의 `wrap.js`, `render.js`, `util.js`, `config.js`, `svg.js`도 읽어 실제 좌표계와 DOM 구조를 확인한다. node_modules는 수정하지 않는다.

## 재현과 원인 확인 순서

1. 실제 `npm run dev`로 재현한다. 새 임시 프로필의 production 빌드 테스트만으로 대체하지 않는다.
2. 사용 중인 장기 종류, 판/기물 스타일, 초·한 시점, 창 크기, 보드 리사이즈 여부, OS 화면 배율/앱 확대율을 기록한다. 기존 설정을 지우지 않는다.
3. Fairy-Stockfish Largeboard로 분석을 켠 뒤 첫 수와 뒤쪽 수를 각각 호버한다. 계속 호버한 채 PV가 바뀌는 경우도 본다.
4. 미리보기는 선택한 수까지 진행된 **미래 FEN**이다. 현재 판과 다른 배치가 정상인 경우와, 기물이 교차점에서 벗어나는 정렬 오류를 구별한다.
5. 배경 래퍼, `.cg-wrap`, `cg-helper`, `cg-container`, `cg-board`, 각 piece의 bounding rect, transform, computed style을 비교한다.
6. **DOM 격자에 맞는다는 것만으로 완료하지 않는다.** 실제 SVG/이미지의 교차점 위치와 기물 중심이 맞는지 화면에서 확인한다. 이미지 내부 여백/크롭 문제는 DOM 좌표 테스트로 놓칠 수 있다.
7. 부모 180도 회전, 내부 역회전, Chessground 자체 orientation의 합성 결과를 확인한다. 메인 보드와 미리보기의 스타일이 서로 영향을 주는지도 확인한다.
8. scoped CSS가 Chessground에서 동적으로 생성한 노드까지 적용되는지, 전역 스타일/후에 로드된 스타일에 덮이는지 확인한다.
9. 새 미리보기 DOM 생성 직후 크기 측정, Chessground의 bounds 캐시, HMR 이후 상태, 리사이즈 재계산 타이밍을 확인한다.
10. 팝업의 top/left가 실제 containing block·스크롤 위치와 맞는지, 부모 overflow로 잘리는지도 확인한다.

위 항목은 조사 방향이며 확정 원인이 아니다. 재현이 안 되면 확인 가능한 코드/화면 작업을 먼저 진행하고, 사용자에게 실제 오류 화면과 설정을 요청한다. “비율 문제를 고쳤으니 해결”이라고 다시 단정하지 않는다.

## 검증 및 이전 검증의 한계

저장소에서 실행 가능한 검사:

```sh
npm run lint
node tests/live-pv.test.cjs
npm run pack
npm run test:smoke
```

Fairy-Stockfish 실행 파일은 새 OS에 맞는 것을 사용한다. 일반 smoke 테스트는 `LIGROUND_TEST_ENGINE`으로 엔진 경로를 지정할 수 있다. `npm run pack`은 실행 중인 개발 빌드와 동일한 dist 경로를 사용할 수 있으므로 두 빌드가 서로 덮어쓰지 않도록 순서를 관리한다.

기존 검증:

- 린트, 빌드, `tests/live-pv.test.cjs` 통과.
- Fairy-Stockfish로 production Electron 실행, 캐시 대체/같은 깊이의 PV 갱신/호버 갱신 확인.
- 임시 확장 smoke에서 백·흑 시점, 리사이즈 후 기물 중심과 계산 격자 좌표, 번호 위치를 검사하고 화면 캡처 확인.
- 그러나 사용자 `npm run dev` 환경에서는 이후에도 표시 오류가 보고됨. 기존 검증은 사용자의 재현 조건을 충분히 다루지 못했다.
- 확장 smoke 및 스크린샷은 이전 컴퓨터의 `/tmp/liground-*`에만 있었다. **새 환경에 존재한다고 가정하지 말 것.** 저장소의 `scripts/smoke-test.cjs`는 이 확장 검사를 포함하지 않는다.
- 저장소의 `tests/live-pv.test.cjs`는 수순/번호 좌표 계산과 sender 처리에 대한 단위 검사이며 실제 DOM·배경 이미지 정렬 검사는 아니다.

## 완료 조건

- 사용자가 보고한 개발 화면의 오류를 재현하고 원인을 설명할 수 있다.
- 메인 보드와 호버 미리보기의 실제 판 교차점에 기물 중심이 정확히 맞는다.
- 초/한 시점, 장기 세 종류, 재현에 사용한 판·기물 스타일, 크기 변경에서도 유지된다.
- 화살표와 1~6 번호가 같은 수를 가리키고, 겹침/잘림/뒤집힌 숫자가 없다.
- 분석이 변하면 화살표·번호·미리보기가 함께 갱신되고 실제 FEN/기보는 바뀌지 않는다.
- 기존 PGN, 한수쉼, 엔진 추가/제거 기능에 회귀가 없다.
- 관련 검사를 통과하고 `npm run dev` 화면에서 전후 비교를 확인한다.
- 변경 파일, 확인한 재현 조건, 남은 한계를 보고한다. 빌드·설정 파일 유지 여부도 확인한다.
