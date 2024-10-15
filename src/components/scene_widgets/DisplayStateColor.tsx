import React from "react";
import { Box } from "@mui/material";
import { DisplayStateColorElementProps } from "../../karabo_data/SceneElements";

/*
Values of state colors used by the GUI Client

    UNKNOWN_COLOR = (255, 170, 0)
    KNOWN_NORMAL_COLOR = (200, 200, 200)
    INIT_COLOR = (230, 230, 170)
    DISABLED_COLOR = (255, 0, 255)
    ERROR_COLOR = (255, 0, 0)
    CHANGING_DECREASING_INCREASING_COLOR = (0, 170, 255)
    RUNNING_COLOR = (153, 204, 255)
    STATIC_COLOR = (0, 170, 0)
    ACTIVE_COLOR = (120, 255, 0)
    PASSIVE_COLOR = (204, 204, 255)

Logic for updating value used by the GUI Client

    def value_update(self, proxy):
        value = proxy.value
        color = get_state_color(value)
        sheet = self._style_sheet.format(color)
        self.widget.setStyleSheet(sheet)

        if self.model.show_string:
            self.widget.setText(proxy.value)

Logic for getting the color for a state (from karaboGui/indicators.py):

def get_state_color(value):
    """Return a state color for a given state string

    :param value: state string representation
    :type value: str
    """
    state = State(value)
    if state.isDerivedFrom(State.CHANGING):
        color = STATE_COLORS[State.CHANGING]
    elif state.isDerivedFrom(State.RUNNING):
        color = STATE_COLORS[State.RUNNING]
    elif state.isDerivedFrom(State.ACTIVE):
        color = STATE_COLORS[State.ACTIVE]
    elif state.isDerivedFrom(State.PASSIVE):
        color = STATE_COLORS[State.PASSIVE]
    elif state.isDerivedFrom(State.DISABLED):
        color = STATE_COLORS[State.DISABLED]
    elif state in [State.STATIC, State.NORMAL, State.ERROR, State.INIT]:
        color = STATE_COLORS[state]
    else:
        color = STATE_COLORS[State.UNKNOWN]

    return color

The full set of states with parenthood information - the parent of the state
is the rhs (extracted from karabo/common/states.py) t

UNKNOWN = None
    KNOWN = None
    INIT = None

    ERROR = KNOWN

    # INTERLOCKED is derived from DISABLED, but much more significant
    INTERLOCKED = DISABLED  # noqa

    NORMAL = KNOWN
    STATIC = NORMAL

    INTERLOCK_OK = STATIC

    CHANGING = NORMAL

    DECREASING = CHANGING
    COOLING = DECREASING
    MOVING_LEFT = DECREASING
    MOVING_DOWN = DECREASING
    MOVING_BACK = DECREASING
    ROTATING_CNTCLK = DECREASING
    RAMPING_DOWN = DECREASING
    EXTRACTING = DECREASING
    STOPPING = DECREASING
    EMPTYING = DECREASING
    DISENGAGING = DECREASING
    SWITCHING_OFF = DECREASING

    HOMING = CHANGING
    ROTATING = CHANGING
    MOVING = CHANGING
    SWITCHING = CHANGING
    OPENING = CHANGING
    CLOSING = CHANGING
    SEARCHING = CHANGING

    INCREASING = CHANGING
    HEATING = INCREASING
    MOVING_RIGHT = INCREASING
    MOVING_UP = INCREASING
    MOVING_FORWARD = INCREASING
    ROTATING_CLK = INCREASING
    RAMPING_UP = INCREASING
    INSERTING = INCREASING
    STARTING = INCREASING
    FILLING = INCREASING
    ENGAGING = INCREASING
    SWITCHING_ON = INCREASING

    PAUSED = DISABLED  # noqa

    RUNNING = NORMAL

    ACQUIRING = RUNNING
    PROCESSING = RUNNING

    PASSIVE = STATIC
    WARM = PASSIVE
    COLD = PASSIVE
    PRESSURIZED = PASSIVE
    CLOSED = PASSIVE
    OFF = PASSIVE
    INSERTED = PASSIVE
    STOPPED = PASSIVE
    UNLOCKED = PASSIVE
    DISENGAGED = PASSIVE
    IGNORING = PASSIVE

    ACTIVE = STATIC
    COOLED = ACTIVE
    HEATED = ACTIVE
    EVACUATED = ACTIVE
    OPENED = ACTIVE
    ON = ACTIVE
    EXTRACTED = ACTIVE
    STARTED = ACTIVE
    LOCKED = ACTIVE
    ENGAGED = ACTIVE
    MONITORING = ACTIVE

    DISABLED = KNOWN
    INTERLOCK_BROKEN = DISABLED
*/

const DisplayStateColor: React.FC<DisplayStateColorElementProps> = (props) => {
  // TODO: do the data binding - for now displays UNKNOWN continuously
  return (
    <Box
      sx={{
        position: "absolute",
        width: `${props.width}px`,
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        fontFamily: "Arial, Helvetica, Sans-serif",
        fontSize: 12,
        fontWeight: props.fontWeight.toLowerCase(),
        borderWidth: 1,
        borderStyle: "solid",
        background: "#ffaa00",
        p: "2px",
      }}
    >
      {props.showString ? props.karaboKeys : ""}
    </Box>
  );
};

export default DisplayStateColor;
