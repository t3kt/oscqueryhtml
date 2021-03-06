const toggleMinusSvg = require("svg-inline-loader?classPrefix=_minus!../assets/img/toggle-minus.svg");
const togglePlusSvg = require("svg-inline-loader?classPrefix=_plus!../assets/img/toggle-plus.svg");

const types = require('./types.js');

const DEFAULT_COLOR_ELEM_VALUE = '#4466ff';

// Build controls recursively based upon the json, and append to the parent.
function buildContentsAddToContainer(contents, parentContainer, cfg) {
    let dirNames = Object.keys(contents);
    dirNames.sort();
    for (let j = 0; j < dirNames.length; j++) {
        let nodeName = dirNames[j];
        let dirObj = contents[dirNames[j]];
        // Container for this node.
        let directoryElem = document.createElement('div');
        let id = generateId();
        let html = '<header>';
        // If this has CONTENTS, build a directory node with toggle controls.
        // If it has neither CONTENTS nor TYPE, treat it as an empty directory.
        if (dirObj.CONTENTS || (!dirObj.CONTENTS && !dirObj.TYPE)) {
            html += createTogglerHtml(id, dirNames[j]);
            directoryElem.className = 'dir-container';
        }
        html += '</header>';
        // Main body. This is the element that toggle shows or hides.
        html += '<div id="control_body_' + id +
            '" data-dir-path="' + dirObj.FULL_PATH + '">';
        html += '</div>';
        directoryElem.innerHTML = html;
        let nodeContainer = directoryElem.querySelector('#control_body_' + id);
        // If this has TYPE, build control(s) from the details.
        if (dirObj.TYPE) {
            directoryElem.classList.add('node');
            buildControlElements(nodeContainer, nodeName, dirObj);
        }
        // If this has CONTENTS, recursively handle the inner contents.
        if (dirObj.CONTENTS) {
            buildContentsAddToContainer(dirObj.CONTENTS, nodeContainer);
            directoryElem.appendChild(nodeContainer);
        }
        parentContainer.appendChild(directoryElem);
    }
}

// Create html for toggle controls that show and hide directory contents.
function createTogglerHtml(id, name) {
    let html = '';
    // Toggle button when this is collapsed, will show the node.
    html += '<div class="toggle-show" id="toggle_show_' + id +
        '" style="display:none">';
    html += '<span class="svg-show">' + togglePlusSvg + '</span>';
    html += '<span class="dir-name"> ' + E(name) + '</span>';
    html += '</div>';
    // Toggle button when this is expanded, will hide the node.
    html += '<div class="toggle-hide" id="toggle_hide_' + id + '">';
    html += '<span class="svg-hide">' + toggleMinusSvg + '</span>';
    html += '<span class="dir-name">' + E(name) + '</span>';
    html += '</div>';
    return html;
}

function shortDisplay(text) {
    if (text.length > 28) {
        return (text.substring(0, 20) + '...' +
                text.substring(text.length - 6, text.length));
    }
    return text;
}

// Add control nodes. Iterate the type field, adding one node per kind of type.
function buildControlElements(containerElem, name, details, cfg) {
    // Handle the case where a directory is also a control.
    let existingName = containerElem.parentNode.querySelector('.dir-name');
    if (!existingName) {
        createAppendElem(containerElem, 'span', 'control-name',
                         shortDisplay(name));
    }
    createAppendElem(containerElem, 'span', 'full-path',
                     shortDisplay(details.FULL_PATH));
    createAppendElem(containerElem, 'span', 'description', details.DESCRIPTION);
    let groupElem = document.createElement('div');
    groupElem.className = 'group';
    // Traverse the input.
    let selector = [0];
    let pos = 0;
    for (let i = 0; i < details.TYPE.length; i++) {
        let type = details.TYPE[i];
        if (type == '[') {
            selector.push(0);
            continue;
        } else if (type == ']') {
            selector.pop();
        } else {
            details.name = name;
            let html = buildSingleControl(details, type, selector, pos, cfg);
            if (html) {
                let id = generateId();
                let kind = types.extractControlKind(type, html);
                let elem = document.createElement('div');
                elem.id = 'control_body_' + id;
                elem.className = 'control kind_' + kind;
                elem.innerHTML = html;
                groupElem.appendChild(elem);
            }
            pos += 1;
        }
        selector[selector.length - 1]++;
    }
    containerElem.appendChild(groupElem);
}

function buildSingleControl(details, type, selector, pos, cfg) {
    var html = '';
    var getter = null;
    var setter = null;
    cfg = cfg || {};
    if (type == 'c') {
        // Char
        if (details.RANGE && applySelector(details.RANGE, selector, 'VALS')) {
            var options = applySelector(details.RANGE, selector, 'VALS');
            var value = applyPos(details.VALUE, pos) || '';
            html += '<select>';
            for (let i = 0; i < options.length; i++) {
                let v = options[i];
                html += '<option value="' + E(v) + '" ';
                if (v == value) {
                    html += 'selected ';
                }
                html += '>' + E(v) + '</option>';
            }
            html += '</select>';
            getter = 'value';
        } else {
            var value = applyPos(details.VALUE, pos) || '';
            html += '<input data-event="keypress" type="text" maxlength="1" ' +
                'size="3" value="' + E(value) + '"/>';
            getter = 'value';
        }
    } else if (type == 'r') {
        // Color
        var value = applyPos(details.VALUE, pos);
        if (value && value[0] === '#') {
            // Remove alpha channel to just get '#rrggbb'.
            value = value.substr(0, 7);
        } else if (value) {
            value = convertOSCColorToHex(value);
        } else {
            value = DEFAULT_COLOR_ELEM_VALUE;
        }
        if (cfg.supportHtml5Color) {
            html += '<input type="color" value="' + value + '" />';
        } else {
            html += ('<div class="color-control" data-value="' + value +
                     '"></div>');
        }
        getter = 'color';
        setter = 'color';
    } else if (type == 'd') {
        // Double
        if (details.RANGE && applySelector(details.RANGE, selector, 'VALS')) {
            var options = applySelector(details.RANGE, selector, 'VALS');
            var value = applyPos(details.VALUE, pos) || 0;
            html += '<select>';
            for (let i = 0; i < options.length; i++) {
                let v = options[i];
                html += '<option value="' + E(v) + '" ';
                if (v == value) {
                    html += 'selected ';
                }
                html += '>' + E(v) + '</option>';
            }
            html += '</select>';
            getter = 'value';
        } else if (details.RANGE) {
            var min = applySelector(details.RANGE, selector, 'MIN') || 0;
            var max = applySelector(details.RANGE, selector, 'MAX') || 1;
            var value = applyPos(details.VALUE, pos) || 0;
            html += buildCurrRangeValue(value, min, max);
            html += '<input type="range" min="' + E(min) + '" max="' +
                E(max) + '" value="' + E(value) + '" step="any"/>';
            getter = 'parseFloat';
            setter = 'float';
        } else {
            var value = applyPos(details.VALUE, pos) || 0;
            html += buildCurrRangeValue(value);
            html += '<input type="range" value="' + E(value) + '" step="any"/>';
            getter = 'parseFloat';
            setter = 'float';
        }
    } else if (type == 'F') {
        // False
        var value = applyPos(details.VALUE, pos) || false;
        html += '<input type="button" data-toggle="yes"' +
            ' value="' + E_bool(value) + '"';
        if (value) {
            html += ' class="enabled"';
        }
        html += '/>';
        getter = 'boolToggle';
        setter = 'setToggle';
    } else if (type == 'f') {
        // Float
        if (details.RANGE && applySelector(details.RANGE, selector, 'VALS')) {
            var options = applySelector(details.RANGE, selector, 'VALS');
            var value = applyPos(details.VALUE, pos) || 0;
            html += '<select>';
            for (let i = 0; i < options.length; i++) {
                let v = options[i];
                html += '<option value="' + E(v) + '" ';
                if (v == value) {
                    html += 'selected ';
                }
                html += '>' + E(v) + '</option>';
            }
            html += '</select>';
            getter = 'value';
        } else if (details.RANGE) {
            var min = applySelector(details.RANGE, selector, 'MIN') || 0;
            var max = applySelector(details.RANGE, selector, 'MAX') || 1;
            var value = applyPos(details.VALUE, pos) || 0;
            html += buildCurrRangeValue(value, min, max);
            html += '<input type="range" min="' + E(min) + '" max="' +
                E(max) + '" value="' + E(value) + '" step="any"/>';
            getter = 'parseFloat';
            setter = 'float';
        } else {
            var value = applyPos(details.VALUE, pos) || 0;
            html += buildCurrRangeValue(value);
            html += '<input type="range" value="' + E(value) + '" step="any"/>';
            getter = 'parseFloat';
            setter = 'float';
        }
    } else if (type == 'I') {
        // Infinity
        html += '<input type="button" value="' + E(details.name) + '"/>';
        setter = 'button';
    } else if (type == 'i') {
        // Integer
        if (details.RANGE && applySelector(details.RANGE, selector, 'VALS')) {
            var options = applySelector(details.RANGE, selector, 'VALS');
            var value = applyPos(details.VALUE, pos) || 0;
            if (options.length == 1) {
                value = options[0];
                html += '<input type="button" value="' + E(value) +
                    '" data-first="' + E(value) + '"/>';
                getter = 'parseSingle';
                setter = 'button';
            } else if (options.length == 2) {
                first = options[0];
                second = options[1];
                value = applyPos(details.VALUE, pos) || first;
                html += '<input type="button" data-toggle="yes"';
                if (value == second) {
                    html += ' class="enabled"';
                }
                html += ' value="' + E(value) +
                    '" data-first="' + E(first) +
                    '" data-second="' + E(second) + '"/>';
                getter = 'parseIntToggle';
                setter = 'setToggle';
            } else {
                html += '<select>';
                for (let i = 0; i < options.length; i++) {
                    let v = options[i];
                    html += '<option value="' + E(v) + '" ';
                    if (v == value) {
                        html += 'selected ';
                    }
                    html += '>' + E(v) + '</option>';
                }
                html += '</select>';
                getter = 'value';
            }
        } else if (details.RANGE) {
            var min = applySelector(details.RANGE, selector, 'MIN');
            var max = applySelector(details.RANGE, selector, 'MAX');
            if (min == null || max == null) {
                return ('<span class="error">Invalid node: RANGE needs ' +
                        'MIN,MAX or VALS</span>');
            }
            var value = applyPos(details.VALUE, pos) || 0;
            if (max - min == 0) {
                value = min;
                html += '<input type="button" value="' + E(value) +
                    '" data-first="' + E(value) + '"/>';
                getter = 'parseSingle';
                setter = 'button';
            } else if (max - min == 1) {
                value = applyPos(details.VALUE, pos) || min;
                html += '<input type="button" data-toggle="yes"';
                if (value == max) {
                    html += ' class="enabled"';
                }
                html += ' value="' + E(value) +
                    '" data-first="' + E(min) +
                    '" data-second="' + E(max) + '"/>';
                getter = 'parseIntToggle';
                setter = 'setToggle';
            } else {
                html += buildCurrRangeValue(value, min, max);
                html += '<input type="range" min="' + E(min) + '" max="' +
                    E(max) + '" value="' + E(value) + '" />';
                getter = 'parseInt';
                setter = 'int';
            }
        } else {
            var value = applyPos(details.VALUE, pos) || 0;
            html += buildCurrRangeValue(value);
            html += '<input type="range" value="' + E(value) + '" />';
            getter = 'parseInt';
            setter = 'int';
        }
    } else if (type == 'h') {
        // Longlong
        if (details.RANGE && applySelector(details.RANGE, selector, 'VALS')) {
            var options = applySelector(details.RANGE, selector, 'VALS');
            var value = applyPos(details.VALUE, pos) || 0;
            html += '<select>';
            for (let i = 0; i < options.length; i++) {
                let v = options[i];
                html += '<option value="' + E(v) + '" ';
                if (v == value) {
                    html += 'selected ';
                }
                html += '>' + E(v) + '</option>';
            }
            html += '</select>';
            getter = 'parseInt64';
            setter = 'int64';
        } else if (details.RANGE) {
            var min = applySelector(details.RANGE, selector, 'MIN') || 0;
            var max = applySelector(details.RANGE, selector, 'MAX') || 1;
            var value = applyPos(details.VALUE, pos) || 0;
            html += buildCurrRangeValue(value, min, max);
            html += '<input type="range" min="' + E(min) + '" max="' +
                E(max) + '" value="' + E(value) + '"/>';
            getter = 'parseInt64';
            setter = 'int64';
        } else {
            var value = applyPos(details.VALUE, pos) || 0;
            html += buildCurrRangeValue(value);
            html += '<input type="range" value="' + E(value) + '"/>';
            getter = 'parseInt64';
            setter = 'int64';
        }
    } else if (type == 'm') {
        // MIDI
        return null;
    } else if (type == 'N') {
        // Null
        html += '<input type="button" value="' + E(details.name) + '"/>';
        setter = 'button';
    } else if (type == 's') {
        // String
        if (details.RANGE && applySelector(details.RANGE, selector, 'VALS')) {
            var options = applySelector(details.RANGE, selector, 'VALS');
            var value = applyPos(details.VALUE, pos) || '';
            html += '<select>';
            for (let i = 0; i < options.length; i++) {
                let v = options[i];
                html += '<option value="' + E(v) + '" ';
                if (v == value) {
                    html += 'selected ';
                }
                html += '>' + E(v) + '</option>';
            }
            html += '</select>';
            getter = 'value';
        } else {
            var value = applyPos(details.VALUE, pos) || '';
            html += '<input type="text" value="' + E(value) + '"/>';
            getter = 'value';
        }
    } else if (type == 'T') {
        // True
        var value = applyPos(details.VALUE, pos);
        // NOTE: Can't use `func() || true` because `false` is possible value.
        if (value === null) { value = true; }
        html += '<input type="button" data-toggle="yes"' +
            ' value="' + E_bool(value) + '"'
        if (value) {
            html += ' class="enabled"';
        }
        html += '/>';
        getter = 'boolToggle';
        setter = 'setToggle';
    } else if (type == 't') {
        // Timetag
        return null;
    } else {
        html += '<span class="type">UNKNOWN (' + E(type) + ')</span>';
    }
    html += '<span class="details" data-full-path="' + E(details.FULL_PATH) +
        '" data-type="' + E(type) + '" ';
    if (getter) {
        html += 'data-getter="' + E(getter) + '" ';
    }
    if (setter) {
        html += 'data-setter="' + E(setter) + '" ';
    }
    html += '/></span>';
    return html;
}

function buildCurrRangeValue(value, min, max) {
    let html = '<span class="curr-range-val">';
    if (min === undefined && max === undefined) {
        html += '<span class="curr-val">' + E(value) + '</span>';
    } else {
        html += '<span class="curr-val">' + E(value) + '</span>';
        html += '<span class="range-val"> (' + E(min) + '-' +
            E(max) + ')</span>';
    }
    html += '</span>';
    return html;
}

// Add an element to the parent, with the tag, class, and text content.
function createAppendElem(parentElem, tagName, className, text) {
    let elem = document.createElement(tagName);
    elem.className = className;
    elem.textContent = text;
    parentElem.appendChild(elem);
}

var g_idGen = 0;

function generateId() {
    let result = g_idGen;
    g_idGen++;
    return result;
}

function applySelector(obj, selector, key) {
    if (!obj) {
        return null;
    }
    if (!Array.isArray(obj)) {
        return obj[key];
    }
    for (let n = 0; n < selector.length; n++) {
        let i = selector[n];
        obj = obj[i];
        if (!obj) {
            return null;
        }
    }
    return obj[key];
}

function applyPos(obj, pos) {
    if (!obj) {
        return null;
    }
    if (Array.isArray(obj)) {
        return obj[pos];
    }
    return obj;
}

function textToHexColor(elem) {
    return '#' + num2Hex(elem['r']) + num2Hex(elem['g']) + num2Hex(elem['b']);
}

function num2Hex(num) {
    let hex = Number(Math.floor(num)).toString(16);
    if (hex.length < 2) {
        hex = '0' + hex;
    }
    return hex;
}

function convertOSCColorToHex(c) {
    return '#' + num2Hex(c[0]*255) + num2Hex(c[1]*255) + num2Hex(c[2]*255);
}

function E(text) {
    if (text === 0) {
        return "0";
    }
    if (!text) {
        return "";
    }
    return text.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').
        replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function E_bool(bool) {
    return bool ? "true" : "false";
}

module.exports = {
    buildContentsAddToContainer: buildContentsAddToContainer,
    buildControlElements: buildControlElements,
    buildSingleControl: buildSingleControl,
    textToHexColor: textToHexColor,
    createTogglerHtml: createTogglerHtml,
    shortDisplay: shortDisplay,
    generateId: generateId,
}
