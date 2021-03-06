global.STATES = {
  INIT:        -1,
  LOBBY:        0,
  PLAYING:      1,
  INTERMISSION: 2
}

global.EVENTS = {
  JOIN:      0,
  NAME:      1,
  QUIT:      2,
  NEW_ROUND: 10,
  GUESS:     11,
  DRAW_LINE: 20,
  DRAW_FILL: 21,
  NAME_CONFLICT: 60
}

global.LOGTYPE = {
  NONE: 0,
  DEBUG: 1,
  WARNING: 2,
  ERROR: 3,
  STATE: 4,
  INFO: 5
}