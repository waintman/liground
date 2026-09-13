<template>
  <!-- All components but menubar -->
  <div id="inner">
    <div>
      <div class="main-grid">
        <div class="chessboard-grid">
          <div class="board-grid">
            <div class="board">
              <span>
                <GameInfo
                  v-if="QuickTourIndex !== 15"
                  id="gameinfo"
                />
                <GameInfo
                  v-else
                  id="gameinfo-qt"
                />
              </span>
              <div
                v-show="(variant==='janggi' || variant==='janggimodern' || variant ==='janggicasual')"
                class="selectRedPiecePosition"
              >
                <div>초 : {{ blue_score() }}</div>
                <div class="leftPieces">
                  <button
                    :disabled="currentMove"
                    @click="changeRedPieces(orientation === 'white' ? 1 : 60)"
                  >
                    <b>&lt; &nbsp; &gt; </b>
                  </button>
                </div>
                <div>
                  <button
                    :disabled="!canPass"
                    @click="passMove()"
                  >
                    한수쉼
                  </button>
                </div>
                <div class="rightPieces">
                  <button
                    :disabled="currentMove"
                    @click="changeRedPieces(orientation === 'white' ? 6 : 55)"
                  >
                    <b>&lt; &nbsp; &gt; </b>
                  </button>
                </div>
                <div>한: {{ red_score() }}</div>
              </div>
              <div
                class="scrollable"
                @mousewheel.prevent.exact="scroll($event)"
              >
                <ChessGround
                  v-if="QuickTourIndex !== 2"
                  id="chessboard"
                  :orientation="orientation"
                  @onMove="showInfo"
                />
                <ChessGround
                  v-else
                  id="chessboard-qt"
                  :orientation="orientation"
                  @onMove="showInfo"
                />
              </div>
              <EvalBar
                v-if="QuickTourIndex !== 3"
                class="evalbar"
              />
              <EvalBar
                v-else
                class="evalbar-qt"
              />
              <div
                v-show="(variant==='janggi' || variant==='janggimodern' || variant ==='janggicasual')"
                class="selectBluePiecePosition"
              >
                <div class="leftPieces">
                  <button
                    :disabled="currentMove"
                    @click="changeRedPieces(orientation === 'white' ? 55 : 6)"
                  >
                    <b>&lt; &nbsp; &gt; </b>
                  </button>
                </div>
                <div class="rightPieces">
                  <button
                    :disabled="currentMove"
                    @click="changeRedPieces(orientation === 'white' ? 60 : 1)"
                  >
                    <b>&lt; &nbsp; &gt; </b>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div
            v-if="QuickTourIndex !== 4"
            id="fen-field"
          >
            FEN <input
              id="lname"
              type="text"
              name="lname"
              placeholder="fen position"
              :value="fen"
              :size="setFenSize()"
              @change="checkValidFEN"
            >
            <div
              v-if="opening"
              class="opening-label"
            >
              {{ opening.eco }} – {{ opening.name }}
            </div>
          </div>
          <div
            v-else
            id="fen-field-qt"
          >
            FEN <input
              id="lname"
              type="text"
              name="lname"
              placeholder="fen position"
              :value="fen"
              :size="setFenSize()"
              @change="checkValidFEN"
            >
            <div
              v-if="opening"
              class="opening-label"
            >
              {{ opening.eco }} – {{ opening.name }}
            </div>
          </div>
          <JumpButtons
            v-if="QuickTourIndex !== 14"
            id="jump-buttons"
            @flip-board="flipBoard"
            @move-to-start="moveToStart"
            @move-back-one="moveBackOne"
            @move-forward-one="moveForwardOne"
            @move-to-end="moveToEnd"
          />
          <JumpButtons
            v-else
            id="jump-buttons-qt"
            @flip-board="flipBoard"
            @move-to-start="moveToStart"
            @move-back-one="moveBackOne"
            @move-forward-one="moveForwardOne"
            @move-to-end="moveToEnd"
          />
        </div>
        <EvalPlot
          v-if="QuickTourIndex !== 6"
          id="evalplot"
        />
        <EvalPlot
          v-else
          id="evalplot-qt"
        />
        <div id="right-column">
          <AnalysisView
            id="analysisview"
            class="tab"
            :class="{ visible: viewAnalysis }"
            :reset="resetAnalysis"
            @move-to-start="moveToStart"
            @move-to-end="moveToEnd"
            @move-back-one="moveBackOne"
            @move-forward-one="moveForwardOne"
            @flip-board="flipBoard"
          />
          <SettingsTab
            id="settingstab"
            class="tab"
            :class="{ visible: !viewAnalysis }"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import AnalysisView from './AnalysisView'
import EvalBar from './EvalBar'
import EvalPlot from './EvalPlot'
import ChessGround from './ChessGround'
import JumpButtons from './JumpButtons'
import SettingsTab from './SettingsTab'
import GameInfo from './GameInfo.vue'
import { findBestOpeningForFen } from '../../shared/openingLookup'
import { mapGetters } from 'vuex'

export default {
  name: 'GameBoards',
  components: {
    AnalysisView,
    EvalBar,
    EvalPlot,
    ChessGround,
    JumpButtons,
    GameInfo,
    SettingsTab
  },
  emits: ['resetMultiEngine'],
  data () {
    return {
      positionInfo: '',
      game: null,
      keyboardHandler: null,
      resetAnalysis: false
    }
  },
  computed: {
    canPass () {
      return !this.$store.getters.EvE && (!this.$store.getters.PvE ||
        this.$store.getters.turn === this.$store.getters.PvEPlayerIsWhite)
    },
    viewAnalysis () {
      return this.$store.getters.viewAnalysis
    },
    variant () {
      return this.$store.getters.variant
    },
    orientation () {
      return this.$store.getters.orientation
    },
    moves () {
      return this.$store.getters.moves
    },
    fen () {
      return this.$store.getters.fen
    },
    opening () {
      if (!this.fen) return null
      // only makes sense for standard chess
      if (this.variant && this.variant !== 'chess') return null
      return this.findOpeningProgressive()
    },
    mainFirstMove () {
      return this.$store.getters.mainFirstMove
    },
    startFen () {
      return this.$store.getters.startFen
    },
    currentMove () { // returns undefined when the current fen doesnt match a move from the history, otherwise it returns move from the moves array that matches the current fen
      for (let num = 0; num < this.moves.length; num++) { // beware that it matches by current FEN, not the one after dispatching a new one
        if (this.moves[num].fen === this.fen) {
          return this.moves[num]
        }
      }
      return undefined
    },
    ...mapGetters(['QuickTourIndex', 'engineIndex'])
  },
  mounted () { // EventListener für Keyboardinput, ruft direkt die jeweilige Methode auf
    this.keyboardHandler = (event) => {
      const keyName = event.key
      if (!event.target.closest('input:not([type=checkbox]), textarea, select, [contenteditable=true]')) {
        if (keyName === 'ArrowUp') {
          event.preventDefault()
          this.moveToStart()
        }
        if (keyName === 'ArrowDown') {
          event.preventDefault()
          this.moveToEnd()
        }
        if (keyName === 'ArrowLeft') {
          event.preventDefault()
          this.moveBackOne()
        }
        if (keyName === 'ArrowRight') {
          event.preventDefault()
          this.moveForwardOne()
        }
        if (keyName === 'n') {
          event.preventDefault()
          this.openNextGame()
        }
        if (keyName === 'p') {
          event.preventDefault()
          this.openPrevGame()
        }
      }
    }
    window.addEventListener('keydown', this.keyboardHandler)
  },
  beforeUnmount () {
    window.removeEventListener('keydown', this.keyboardHandler)
  },
  methods: {
    passMove () {
      if (!this.canPass) return
      let _fen = this.fen
      let uciMove = ''
      if (this.$store.getters.turn) {
        _fen = _fen.split('/')
        const n = [7, 8, 9]
        n.forEach(i => {
          const ki = _fen[i].indexOf('K')
          if (ki === -1) return
          let pos = 0
          _fen[i].substring(0, ki).split('').forEach(c => {
            pos = pos + (parseInt(c) || 1)
          })
          const convertC = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
          uciMove = convertC[pos] + (10 - i)
          uciMove = uciMove + uciMove
          return false
        })
      } else {
        _fen = _fen.split('/')
        const n = [0, 1, 2]
        n.forEach(i => {
          const ki = _fen[i].indexOf('k')
          if (ki === -1) return
          let pos = 0
          _fen[i].substring(0, ki).split('').forEach(c => {
            pos = pos + (parseInt(c) || 1)
          })
          const convertC = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i']
          uciMove = convertC[pos] + (10 - i)
          uciMove = uciMove + uciMove
          return false
        })
      }
      if (!uciMove || !this.$store.getters.legalMoves.split(' ').includes(uciMove)) return
      const lastMoveSan = this.$store.getters.sanMove(uciMove)
      const prevMov = this.currentMove
      this.$store.dispatch('push', { move: uciMove, prev: prevMov })
      const events = {}
      events.fen = this.fen
      events.history = [lastMoveSan]
      this.$store.dispatch('lastFen', this.fen)
    },
    replacePieces (str, a) {
      return str.substring(0, a) + str[a + 1] + str[a] + str.substring(a + 2)
    },
    changeRedPieces (a) {
      let _fen = this.fen
      _fen = this.replacePieces(_fen, a)
      this.$store.dispatch('fenField', _fen)
    },
    setFenSize () {
      return this.fen.length + 3
    },
    blue_score () {
      let _fen = this.fen
      let score = 0
      _fen = _fen.split(' ')[0]
      _fen.split('').forEach(c => {
        switch (c) {
          case 'R':
            score = score + 13
            break
          case 'B':
            score = score + 3
            break
          case 'N':
            score = score + 5
            break
          case 'A':
            score = score + 3
            break
          case 'P':
            score = score + 2
            break
          case 'C':
            score = score + 7
            break
        }
      })
      return score
    },
    red_score () {
      let _fen = this.fen
      let score = 0
      _fen = _fen.split(' ')[0]
      _fen.split('').forEach(c => {
        switch (c) {
          case 'r':
            score = score + 13
            break
          case 'b':
            score = score + 3
            break
          case 'n':
            score = score + 5
            break
          case 'a':
            score = score + 3
            break
          case 'p':
            score = score + 2
            break
          case 'c':
            score = score + 7
            break
        }
      })
      return score + 1.5
    },
    scroll (event) { // TODO: also moves back and forth when being slightly next to the board and for example over the pockets
      if (event.deltaY < 0) {
        this.moveBackOne()
      } else {
        this.moveForwardOne()
      }
    },
    moveToStart () { // this method returns to the starting point of the current line
      this.$store.dispatch('fen', this.startFen)
    },
    moveToEnd () { // this method moves to the last move of the current line
      const mov = this.currentMove
      let endOfLine = mov
      if (!mov && this.moves.length === 0) {
        return
      } else if (!mov && this.moves.length > 0) {
        endOfLine = this.mainFirstMove
        while (endOfLine.main) {
          endOfLine = endOfLine.main
        }
      } else {
        endOfLine = mov
        while (endOfLine.main) {
          endOfLine = endOfLine.main
        }
      }
      this.$store.dispatch('fen', endOfLine.fen)
    },
    moveBackOne () { // this method moves back one move in the current line
      const mov = this.currentMove
      if (!mov) {
        return
      }
      if (mov.ply === 1 || !mov.prev) {
        this.$store.dispatch('fen', this.startFen)
        return
      }
      this.$store.dispatch('fen', mov.prev.fen)
    },
    moveForwardOne () { // this method moves forward one move in the current line
      const mov = this.currentMove
      if (!mov) {
        if (this.mainFirstMove) {
          this.$store.dispatch('playAudio', this.mainFirstMove.name)
          this.$store.dispatch('fen', this.mainFirstMove.fen)
        }
        return
      }
      if (!mov.main) {
        return
      }
      this.$store.dispatch('playAudio', mov.main.name)
      this.$store.dispatch('fen', mov.main.fen)
    },
    openNextGame () { // selects the next game, if a pgn with multiple games has been opened
      if (!this.$store.getters.loadedGames.length) return
      const selGame = this.$store.getters.selectedGame
      if (selGame) {
        const loadedGames = this.$store.getters.loadedGames
        if (loadedGames.length > (selGame.id + 1)) {
          const nextGame = loadedGames[selGame.id + 1]
          this.$store.dispatch('loadGame', { game: nextGame })
          this.closeThisRoundOpenNext(selGame, nextGame)
        }
      } else { // we just loaded the pgn
        this.$store.dispatch('loadGame', { game: this.$store.getters.loadedGames[0] })
      }
    },
    openPrevGame () { // selects the previous game, if a pgn with multiple games has been opened
      if (!this.$store.getters.loadedGames.length) return
      const selGame = this.$store.getters.selectedGame
      if (selGame) {
        const loadedGames = this.$store.getters.loadedGames
        if (selGame.id !== 0) {
          const prevGame = loadedGames[selGame.id - 1]
          this.$store.dispatch('loadGame', { game: prevGame })
          this.closeThisRoundOpenNext(selGame, prevGame)
        }
      } else { // we just loaded the pgn
        const loadedGames = this.$store.getters.loadedGames
        this.$store.dispatch('loadGame', { game: loadedGames[loadedGames.length - 1] })
        // show last round
        this.toggleRoundVisibility(loadedGames[loadedGames.length - 1])
        // hide first round, it is expanded by default
        const firstRound = this.$store.getters.rounds[0]
        firstRound.visible = !firstRound.visible
      }
    },
    closeThisRoundOpenNext (lastGame, nextGame) {
      if (lastGame.headers('Round') !== nextGame.headers('Round') ||
          lastGame.headers('Event') !== nextGame.headers('Event')) {
        this.toggleRoundVisibility(lastGame)
        this.toggleRoundVisibility(nextGame)
      }
    },
    toggleRoundVisibility (game) {
      const rounds = this.$store.getters.rounds
      for (const idx in rounds) {
        const round = rounds[idx]
        if (round.name === game.headers('Round') && round.eventName === game.headers('Event')) {
          round.visible = !round.visible
        }
      }
    },
    flipBoard () {
      if (this.variant === 'racingkings') {
        return
      }
      if (this.orientation === 'white') {
        this.$store.dispatch('orientation', 'black')
      } else {
        this.$store.dispatch('orientation', 'white')
      }
    },
    selectPocketPiece (piece) {
      this.$store.commit('selectPocketPiece', ['boardA', piece.type])
    },
    deselectPocketPieces () {
      this.$store.commit('selectPocketPiece', ['boardA', ''])
    },
    findOpeningProgressive () {
      let mov = this.currentMove
      // check current position
      const opening = findBestOpeningForFen(this.fen)
      if (opening) return opening

      // if no exact match, backtrack
      while (mov && mov.prev) {
        mov = mov.prev
        const opening = findBestOpeningForFen(mov.fen)
        if (opening) return opening
      }

      return null
    },
    showInfo (event) {
      console.log(`showInfo: ${this.fen}`)
      console.log(`fen: ${this.$store.getters.fen}`)
      console.log(`event.history: ${event.history}`)

      if (this.$store.getters.active) {
        this.$store.dispatch('stopEngine')
        this.$store.dispatch('position')
        this.$store.dispatch('goEngine')
      }
    },
    drawArrow (event) {
      console.log(`event: ${event}`)
    },
    checkValidFEN (event) {
      document.dispatchEvent(new Event('resetPlot'))
      this.$store.dispatch('fenField', event.target.value)
      this.resetAnalysis = !this.resetAnalysis
    },
    resetBoard () {
      if (confirm('Do you really want to reset the board?')) {
        document.dispatchEvent(new Event('resetPlot'))
        this.$store.dispatch('resetBoard', { is960: false }) // used to exit 960 Mode
        this.$emit('resetMultiEngine')
      }
    }
  }
}
</script>

<style scoped>
.main-grid {
  display: grid;
  grid-template-columns: minmax(45%, 1fr) minmax(30%, 1fr);
  grid-template-rows: auto auto auto;
  column-gap: 28px;
  padding-right: 12px;
  grid-template-areas:
    "chessboard analysisview"
    "evalplot analysisview";
}
.chessboard-grid {
  grid-area: chessboard;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto auto auto;
  grid-template-areas:
    "board-grid"
    "fenfield"
    "jumpbuttons";
  min-width: 0;
}

.board-grid {
  grid-area: board-grid;
  display: flex;
  flex-direction: row;
  justify-content: center;
}

.selectRedPiecePosition{
  grid-area: selectRedPiecePosition;
  display:grid;
  flex-direction:column;
  grid-template-columns: 70px auto auto auto 90px;
  grid-template-areas: '. leftPieces . rightPieces .';
  height:20px;
}

.selectBluePiecePosition{
  grid-area: selectBluePiecePosition;
  display:grid;
  flex-direction:column;
  grid-template-columns: 70px auto auto auto 70px;
  grid-template-areas: '. leftPieces . rightPieces .';
  height:20px;
}
.leftPieces {
  width: 100px;
  display: flex;
  grid-area: leftPieces;
}
.leftPieces > button {
  width: 100%;
}
.rightPieces{
  grid-area: rightPieces;
  display: flex;
  justify-content: flex-end;
}
.rightPieces > button {
  width: 100px;

}
.reset {
  background-color:var(--button-color);
  color: white;
  outline: none;
  border-radius: 5px;
  box-shadow: 1px 1px 1px 1px black;
  padding-bottom: 5px;
  padding-top: 5px;
}
.resetButton {
  display: grid;
  padding-left: 4px;
}
.reset:hover {
  background-color: var(--hover-color);
  cursor:pointer;
}
#gameinfo {
  grid-area: gameinfo;
  border: 1px solid var(--main-border-color);
  margin-bottom: 5px;
  margin-left: 5px;
  border-radius: 5px;
  background-color: var(--second-bg-color);
}
#gameinfo-qt {
  grid-area: gameinfo;
  border: 5px solid var(--quicktour-highlight);
  margin-bottom: 5px;
  margin-left: 5px;
  border-radius: 5px;
  background-color: var(--second-bg-color);
}
.panel {
  border-radius: 3px 3px 3px 3px;
  border: 1px solid var(--main-border-color);
  font-family: sans-serif;
  font-weight: 200;
}
.panel + .panel {
  margin-top: 7px;
}
#analysisview {
  grid-area: analysisview;
  height: 100%;
  width: 100%;
}
#right-column {
  grid-area: analysisview;
  width: 100%;
  max-height: calc(100vh - 25px);
  min-width: 0;
  padding-left: 16px;
  box-sizing: border-box;
}
.tab:not(.visible) {
  display: none;
}
input {
  font-size: 12pt;
}
#fen-field {
  grid-area: fenfield;
  /*margin-left: 48px;*/
  margin-top: 12px;
}
#fen-field-qt {
  grid-area: fenfield;
  border: 5px solid var(--quicktour-highlight);
  margin-top: 12px;
}
#jump-buttons {
  grid-area: jumpbuttons;
  margin-top: 8px;
}
#jump-buttons-qt {
  grid-area: jumpbuttons;
  margin-top: 8px;
  border: 5px solid var(--quicktour-highlight);
}
#reset-button {
  grid-area: resetfield;
}
#pv-lines {
  grid-area: pvlinesfield;
  justify-self: center;
  width: 80%;
}
#lname {
  background-color: var(--second-bg-color);
  color: var(--main-text-color)
}
#pgnbrowser {
  grid-area: pgnbrowser;
  border: 1px solid var(--main-border-color);
  border-radius: 4px;
  margin-left: 5px;
  max-height: 490px;
}
#pgnbrowser-qt {
  grid-area: pgnbrowser;
  border: 5px solid var(--quicktour-highlight);
  border-radius: 4px;
  margin-left: 1em;
  max-height: 60vh;
}
.scrollable {
  grid-area: scrollable;
  display: flex;
  flex-direction: row;
  justify-content: center;
  width: 100%;
}

.board {
  grid-area: board;
  display: grid;
  column-gap: 12px;
  padding-left: 12px;
  grid-template-areas:
  "gameinfo ."
  "selectRedPiecePosition selectRedPiecePosition"
  "scrollable evalbar"
  "selectBluePiecePosition .";
}
#chessboard {
  display: inline-block;
}
#chessboard-qt {
  display: inline-block;
  border: 5px solid var(--quicktour-highlight);
}
.bottom-margin {
  margin-bottom: 1.5em;
}
#inner {
  display: table;
  margin: 0 auto;
  padding-left: 12px;
}
.evalbar {
  grid-area: evalbar;
  margin-left: 0px;
  padding-right: 0;
  height: auto;
}
.evalbar-qt {
  grid-area: evalbar;
  margin-left: 0px;
  padding-right: 0;
  height: auto;
  border: 3px solid var(--quicktour-highlight);
}
#analysisview {
  /* margin-left: 15px; */
}
#evalplot {
  grid-area: evalplot;
  width: 100%;
  max-width: none;
  margin-top: 12px;
  margin-left: 12px;
}
#evalplot-qt {
  grid-area: evalplot;
  border: 5px solid var(--quicktour-highlight);
  width: 100%;
  max-width: none;
  margin-top: 12px;
  margin-left: 12px;
}
#evalbutton-style {
  margin-top: 10px;
  grid-area: evalButton;
}

@media (max-width: 1100px) {
  .main-grid {
    grid-template-columns: 1fr;
    grid-template-areas:
      "chessboard"
      "evalplot"
      "analysisview";
  }
  #right-column {
    max-height: none;
  }
}

</style>
<style>
.multiselect {
  color: var(--main-text-color, white) !important;
  background-color: var(--second-bg-color, white) !important;
  border-color: var(--main-border-color, white) !important;
}
.multiselect-qt {
  color: var(--main-text-color, white) !important;
  background-color: var(--second-bg-color, white) !important;
  border-color: var(--quicktour-highlight, white) !important;
}
.multiselect__content ,
.multiselect__content-wrapper,
.multiselect__single,
.multiselect__tags ,
.multiselect__element,
.multiselect__option--selected,
.multiselect__input{
    background-color: var(--second-bg-color, white);
    color: var(--main-text-color);
    border-color: var(--main-border-color);
}
.multiselect ::placeholder {
  color: var(--main-text-color) !important;
  opacity: 0.5;
}
.multiselect__select {
  border-radius: 5px;
  right: 2px;
  top: 2px;
  height: 36px;
}

.v-table-header-wrap *,
.v-table-body * {
  background-color: var(--second-bg-color, white) !important;
  color: var(--main-text-color, black) !important;
  border-color: var(--main-border-color, white) !important;
}
.v-table-dynamic * ,
.v-table:before{
  border-color: var(--main-border-color, white) !important;
}
::-webkit-scrollbar {
  width: 15px;
  height: 15px;
}
::-webkit-scrollbar-track{
  background: var(--scroll-track-color);
}
::-webkit-scrollbar-thumb {
  background: var(--scroll-thumb-color);
  border-radius: 8px;
}
::-webkit-scrollbar-corner {
  background: var(--main-bg-color);
  border-radius: 8px;
}

.opening-label {
  margin-top: 4px;
  font-size: 11pt;
  color: var(--main-text-color);
  opacity: 0.9;
}

.opening-label-qt {
  margin-top: 4px;
  font-size: 11pt;
  color: var(--main-text-color);
  opacity: 0.9;
  border: 5px solid var(--quicktour-highlight);
  padding: 2px 4px;
  border-radius: 4px;
}

</style>
