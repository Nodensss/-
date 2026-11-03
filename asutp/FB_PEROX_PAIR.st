(* Информационный расчёт. Нет выходов управления, сигнализации, блокировок или ПАЗ.
   Один экземпляр на связку. Параметры K и уровней задаются по core/config.ts.
   NOW_MIN — монотонные минуты от внешнего источника; системных часов в блоке нет.
   Перед использованием требуется проверка в целевой среде МЭК 61131-3. *)
FUNCTION_BLOCK FB_PEROX_PAIR
VAR_INPUT
    RESET : BOOL;
    SAMPLE_TICK : BOOL; (* Передний фронт внешнего минутного такта *)
    NOW_MIN : LREAL;
    L_SRC : LREAL;
    L_FEED : LREAL;
    OK_SRC : BOOL;
    OK_FEED : BOOL;
    TRANSFER_ON : BOOL;
    TARGET : LREAL;
    BATCH_MM : LREAL;
    MANUAL_ON : BOOL;
    MANUAL_RATE : LREAL;
    K : LREAL;
    L_DEAD : LREAL;
    L_SRC_MAX : LREAL := -1.0; (* -1: ограничение не задано, УТОЧНИТЬ *)
    L_FEED_MAX : LREAL := -1.0; (* -1: перелив не проверяется, УТОЧНИТЬ *)
    WINDOW_MIN : INT := 60; (* 10..120; DT = 1 мин *)
    INFLOW_STEP : LREAL;
    GUARD : INT := 1;
    SETTLE : INT := 2;
    MIN_VALID : INT := 20;
    HOLD_MAX : LREAL := 120.0;
    RATE_MIN : LREAL;
    T_WARN : LREAL := 2.0; (* УТОЧНИТЬ у технолога *)
    T_URGENT : LREAL := 1.0; (* УТОЧНИТЬ у технолога *)
END_VAR
VAR_OUTPUT
    RATE : LREAL := -1.0;
    RATE_STATE : INT := 3;
    RATE_VALID : BOOL;
    USED_MIN : INT;
    EXCL_MIN : INT;
    TRANSFER_NOW : BOOL;
    TRANSFER_IN_WINDOW : BOOL;
    HOLD_AGE_MIN : LREAL := -1.0;
    BELOW_DEAD : BOOL;
    H0 : LREAL := -1.0;
    H0_VALID : BOOL;
    X_SRC : LREAL := -1.0;
    ADD_FEED : LREAL := -1.0;
    L_FIN : LREAL := -1.0;
    H1 : LREAL := -1.0;
    TRANSFER_VALID : BOOL;
    H_BATCH : LREAL := -1.0;
    BATCH_VALID : BOOL;
    OVERFILL : BOOL;
    SRC_MIN_NO_OVERFILL : LREAL := -1.0;
    STATUS : INT := 3;
    PARAM_OK : BOOL;
END_VAR
VAR
    levels : ARRAY[0..120] OF LREAL;
    quality : ARRAY[0..120] OF BOOL;
    transfers : ARRAY[0..120] OF BOOL;
    inflow : ARRAY[0..120] OF BOOL;
    excluded : ARRAY[0..120] OF BOOL;
    previousTick : BOOL;
    edge : BOOL;
    newSample : BOOL;
    head : INT := -1;
    count : INT;
    firstAt : LREAL;
    lastAt : LREAL;
    hasLast : BOOL;
    lastRate : LREAL;
    lastRateAt : LREAL;
    steps : DINT;
    skip : DINT;
    firstStep : DINT;
    n : INT;
    i : INT;
    j : INT;
    a : INT;
    b : INT;
    oldest : INT;
    segmentStart : INT;
    segmentIndex : INT;
    totalDrop : LREAL;
    sourceValid : BOOL;
    currentBad : BOOL;
END_VAR

edge := SAMPLE_TICK AND NOT previousTick;
previousTick := SAMPLE_TICK;
newSample := FALSE;
IF RESET THEN
    head := -1;
    count := 0;
    hasLast := FALSE;
END_IF;

(* Конфигурационные ошибки запрещают прогноз. Уровни поступают в инженерных единицах. *)
PARAM_OK := (K > 0.0) AND (WINDOW_MIN >= 10) AND (WINDOW_MIN <= 120)
    AND (GUARD >= 0) AND (GUARD <= 120) AND (SETTLE >= 0) AND (SETTLE <= 120)
    AND (MIN_VALID > 0) AND (MIN_VALID <= WINDOW_MIN) AND (HOLD_MAX >= 0.0)
    AND (RATE_MIN > 0.0) AND (INFLOW_STEP >= 0.0) AND (T_WARN >= T_URGENT) AND (T_URGENT >= 0.0);

IF edge AND NOT RESET AND PARAM_OK THEN
    IF count = 0 THEN
        head := 0;
        levels[head] := L_FEED;
        quality[head] := OK_FEED AND (L_FEED = L_FEED);
        transfers[head] := TRANSFER_ON;
        count := 1;
        firstAt := NOW_MIN;
        lastAt := NOW_MIN;
        newSample := TRUE;
    ELSIF NOW_MIN >= lastAt + 1.0 THEN
        (* Пропуски тактов заполняются недостоверными отсчётами.
           При длинном разрыве создаётся только хвост размером 121. *)
        steps := TRUNC(NOW_MIN - lastAt);
        firstStep := MAX(1, steps - 120);
        FOR skip := firstStep TO steps DO
            head := (head + 1) MOD 121;
            count := MIN(121, count + 1);
            IF skip = steps THEN
                levels[head] := L_FEED;
                quality[head] := OK_FEED AND (L_FEED = L_FEED);
                transfers[head] := TRANSFER_ON;
            ELSE
                levels[head] := 0.0;
                quality[head] := FALSE;
                transfers[head] := FALSE;
            END_IF;
        END_FOR;
        lastAt := lastAt + DINT_TO_LREAL(steps);
        newSample := TRUE;
    END_IF;
END_IF;

RATE := -1.0;
RATE_STATE := 5;
RATE_VALID := FALSE;
USED_MIN := 0;
EXCL_MIN := 0;
HOLD_AGE_MIN := -1.0;
TRANSFER_NOW := FALSE;
TRANSFER_IN_WINDOW := FALSE;
totalDrop := 0.0;
n := MAX(0, MIN(count - 1, WINDOW_MIN));
oldest := (head - n + 121) MOD 121;
FOR i := 0 TO 120 DO
    inflow[i] := FALSE;
    excluded[i] := FALSE;
END_FOR;
IF count > 0 THEN
    TRANSFER_NOW := transfers[head];
END_IF;
IF n > 0 THEN
    FOR i := 0 TO n - 1 DO
        a := (oldest + i) MOD 121;
        b := (a + 1) MOD 121;
        inflow[i] := transfers[a] OR transfers[b]
            OR (quality[a] AND quality[b] AND (levels[b] - levels[a] > INFLOW_STEP));
        excluded[i] := NOT quality[a] OR NOT quality[b];
        IF inflow[i] THEN TRANSFER_IN_WINDOW := TRUE; END_IF;
    END_FOR;
    FOR i := 0 TO n - 1 DO
        IF inflow[i] THEN
            FOR j := MAX(0, i - GUARD) TO MIN(n - 1, i + SETTLE) DO
                excluded[j] := TRUE;
            END_FOR;
        END_IF;
    END_FOR;
    segmentStart := -1;
    FOR i := 0 TO n DO
        (* Отдельная проверка границы не требует короткого замыкания AND. *)
        IF i < n THEN
            IF excluded[i] THEN
                EXCL_MIN := EXCL_MIN + 1;
            ELSE
                IF segmentStart < 0 THEN segmentStart := i; END_IF;
            END_IF;
        END_IF;
        IF (i = n) OR excluded[i] THEN
            IF segmentStart >= 0 THEN
                segmentIndex := (oldest + segmentStart) MOD 121;
                b := (oldest + i) MOD 121;
                totalDrop := totalDrop + levels[segmentIndex] - levels[b];
                USED_MIN := USED_MIN + i - segmentStart;
                segmentStart := -1;
            END_IF;
        END_IF;
    END_FOR;
END_IF;

(* Приоритет: недостоверно, ручной, окно, удержание, накопление, нет данных.
   Индекс head не используется до первого отсчёта: AND не обязан замыкаться. *)
currentBad := FALSE;
IF count > 0 THEN currentBad := NOT quality[head]; END_IF;
IF NOT PARAM_OK THEN
    RATE_STATE := 5;
ELSIF currentBad THEN
    RATE_STATE := 7;
ELSIF MANUAL_ON THEN
    RATE := MANUAL_RATE;
    RATE_STATE := 6;
ELSIF USED_MIN >= MIN_VALID THEN
    RATE := totalDrop * 60.0 / INT_TO_LREAL(USED_MIN);
    IF EXCL_MIN > 0 THEN RATE_STATE := 1; ELSE RATE_STATE := 0; END_IF;
    IF newSample THEN
        hasLast := TRUE;
        lastRate := RATE;
        lastRateAt := NOW_MIN;
    END_IF;
ELSIF hasLast AND (NOW_MIN >= lastRateAt) AND (NOW_MIN - lastRateAt <= HOLD_MAX) THEN
    RATE := lastRate;
    HOLD_AGE_MIN := NOW_MIN - lastRateAt;
    RATE_STATE := 2;
ELSIF count = 0 THEN
    RATE_STATE := 3;
ELSIF NOW_MIN - firstAt < INT_TO_LREAL(MIN_VALID) THEN
    RATE_STATE := 3;
END_IF;
IF (RATE_STATE = 0) OR (RATE_STATE = 1) OR (RATE_STATE = 2) OR (RATE_STATE = 6) THEN
    IF (RATE < RATE_MIN) OR (RATE <> RATE) THEN RATE_STATE := 4; END_IF;
END_IF;
RATE_VALID := (RATE_STATE = 0) OR (RATE_STATE = 1) OR (RATE_STATE = 2) OR (RATE_STATE = 6);

BELOW_DEAD := L_FEED < L_DEAD;
H0 := -1.0;
H1 := -1.0;
H_BATCH := -1.0;
X_SRC := -1.0;
ADD_FEED := -1.0;
L_FIN := -1.0;
SRC_MIN_NO_OVERFILL := -1.0;
H0_VALID := FALSE;
TRANSFER_VALID := FALSE;
BATCH_VALID := FALSE;
OVERFILL := FALSE;
STATUS := 3;
sourceValid := OK_SRC AND (L_SRC = L_SRC) AND (TARGET = TARGET) AND (BATCH_MM = BATCH_MM)
    AND (L_SRC >= 0.0) AND (TARGET >= 0.0) AND (BATCH_MM >= 0.0);
(* Производные перекачки доступны отдельно от расхода; экран скрывает их при отсутствии прогноза. *)
IF PARAM_OK AND sourceValid THEN
    X_SRC := MAX(L_SRC - TARGET, 0.0);
    IF L_SRC_MAX >= 0.0 THEN X_SRC := MIN(X_SRC, L_SRC_MAX); END_IF;
    ADD_FEED := X_SRC * K;
    L_FIN := L_FEED + ADD_FEED;
    IF (L_FEED_MAX >= 0.0) AND (L_FIN > L_FEED_MAX) THEN
        OVERFILL := TRUE;
        SRC_MIN_NO_OVERFILL := L_SRC - (L_FEED_MAX - L_FEED) / K;
    END_IF;
END_IF;
IF RATE_VALID AND OK_FEED AND (L_FEED = L_FEED) AND (RATE > 0.0) THEN
    H0 := MAX(L_FEED - L_DEAD, 0.0) / RATE;
    H0_VALID := TRUE;
    IF (L_FEED <= L_DEAD) OR (H0 < T_URGENT) THEN
        STATUS := 2;
    ELSIF H0 < T_WARN THEN
        STATUS := 1;
    ELSE
        STATUS := 0;
    END_IF;
    IF sourceValid THEN
        TRANSFER_VALID := TRUE;
        H1 := MAX(L_FIN - L_DEAD, 0.0) / RATE;
        IF BATCH_MM > 0.0 THEN
            H_BATCH := BATCH_MM * K / RATE;
            BATCH_VALID := TRUE;
        END_IF;
    END_IF;
END_IF;
END_FUNCTION_BLOCK
