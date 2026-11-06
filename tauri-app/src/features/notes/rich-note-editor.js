// Rich-note editor behavior and safe rich-text serialization.

export const RICH_NOTE_ALLOWED_TAGS = new Set(['B', 'STRONG', 'I', 'EM', 'U', 'BR', 'DIV', 'P']);
export const getRichNoteSemanticTags = (node, tagName) => {
    if (RICH_NOTE_ALLOWED_TAGS.has(tagName)) return [tagName];
    if (tagName !== 'SPAN') return [];

    const style = String(node.getAttribute('style') || '').toLowerCase();
    return [
        /font-weight\s*:\s*(?:bold|[5-9]00)/.test(style) ? 'STRONG' : null,
        /font-style\s*:\s*italic/.test(style) ? 'EM' : null,
        /text-decoration(?:-line)?\s*:[^;]*underline/.test(style) ? 'U' : null
    ].filter(Boolean);
};
export const getRichNoteTextColor = (node) => {
    if (!node || node.nodeType !== Node.ELEMENT_NODE) return '';
    const tagName = node.tagName.toUpperCase();
    const rawColor = tagName === 'FONT'
        ? node.getAttribute('color')
        : node.style?.color;
    if (!rawColor) return '';

    const probe = document.createElement('span');
    probe.style.color = String(rawColor).trim();
    const safeColor = probe.style.color;
    return safeColor && !/[<>;]/.test(safeColor) ? safeColor : '';
};
export const RICH_NOTE_COLOR_BASE_ATTRIBUTE = 'data-smartemr-color-base';
export const RICH_NOTE_COLOR_THEME_ATTRIBUTE = 'data-smartemr-color-theme';
export const getRichNoteTheme = (theme = document.body?.dataset.theme) => theme === 'dark' ? 'dark' : 'light';
export const clampRichNoteColorChannel = (value) => Math.max(0, Math.min(255, Math.round(Number(value))));
export const parseRichNoteColor = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return null;

    const hexMatch = raw.match(/^#([\da-f]{3,8})$/i);
    if (hexMatch) {
        const hex = hexMatch[1];
        if (hex.length === 3 || hex.length === 4) {
            return {
                r: parseInt(`${hex[0]}${hex[0]}`, 16),
                g: parseInt(`${hex[1]}${hex[1]}`, 16),
                b: parseInt(`${hex[2]}${hex[2]}`, 16)
            };
        }
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }

    const rgbMatch = raw.match(/^rgba?\(\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)\s*[, ]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i);
    if (rgbMatch) {
        const parseChannel = (channel) => channel.endsWith('%')
            ? clampRichNoteColorChannel(parseFloat(channel) * 2.55)
            : clampRichNoteColorChannel(parseFloat(channel));
        const alpha = rgbMatch[4] ? parseFloat(rgbMatch[4].replace('%', '')) : 1;
        if (Number.isFinite(alpha) && alpha <= 0) return null;
        return {
            r: parseChannel(rgbMatch[1]),
            g: parseChannel(rgbMatch[2]),
            b: parseChannel(rgbMatch[3])
        };
    }

    const probe = document.createElement('span');
    probe.style.color = raw;
    if (!probe.style.color) return null;
    const parent = document.body || document.documentElement;
    if (!parent) return null;
    parent.appendChild(probe);
    const computedColor = window.getComputedStyle(probe).color;
    probe.remove();
    return computedColor && computedColor !== raw ? parseRichNoteColor(computedColor) : null;
};
export const normalizeRichNoteColor = (value) => {
    const rgb = parseRichNoteColor(value);
    if (!rgb) return '';
    return `#${[rgb.r, rgb.g, rgb.b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
};
export const invertRichNoteColor = (value) => {
    const rgb = parseRichNoteColor(value);
    if (!rgb) return '';
    return `#${[255 - rgb.r, 255 - rgb.g, 255 - rgb.b].map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
};
export const getRichNoteColorDisplayValue = (baseColor, sourceTheme, targetTheme) => {
    const normalizedBaseColor = normalizeRichNoteColor(baseColor);
    if (!normalizedBaseColor) return '';
    return getRichNoteTheme(sourceTheme) === getRichNoteTheme(targetTheme)
        ? normalizedBaseColor
        : invertRichNoteColor(normalizedBaseColor) || normalizedBaseColor;
};
export const getRichNoteColorMetadata = (node, fallbackColor, fallbackTheme = 'light') => {
    const storedBaseColor = normalizeRichNoteColor(node?.getAttribute(RICH_NOTE_COLOR_BASE_ATTRIBUTE));
    const storedTheme = node?.getAttribute(RICH_NOTE_COLOR_THEME_ATTRIBUTE);
    const sourceTheme = storedTheme === 'dark' || storedTheme === 'light'
        ? storedTheme
        : getRichNoteTheme(fallbackTheme);
    return {
        baseColor: storedBaseColor || normalizeRichNoteColor(fallbackColor),
        sourceTheme
    };
};
export const getRichNoteColoredNodes = (editor) => {
    if (!editor) return [];
    return [editor, ...editor.querySelectorAll('*')]
        .filter(node => Boolean(getRichNoteTextColor(node)));
};
export const sanitizeRichNoteHtml = (html) => {
    const template = document.createElement('template');
    template.innerHTML = String(html || '');
    const output = document.createElement('div');
    const currentTheme = getRichNoteTheme();

    const appendSanitizedNode = (node, parent) => {
        if (node.nodeType === Node.TEXT_NODE) {
            parent.appendChild(document.createTextNode(node.nodeValue || ''));
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tagName = node.tagName.toUpperCase();
        if (tagName === 'BR') {
            parent.appendChild(document.createElement('br'));
            return;
        }

        const semanticTags = getRichNoteSemanticTags(node, tagName);
        let target = parent;
        semanticTags.forEach(semanticTag => {
            const element = document.createElement(semanticTag.toLowerCase());
            target.appendChild(element);
            target = element;
        });
        const textColor = getRichNoteTextColor(node);
        if (textColor) {
            const { baseColor, sourceTheme } = getRichNoteColorMetadata(node, textColor);
            const colorElement = document.createElement('span');
            colorElement.style.color = getRichNoteColorDisplayValue(baseColor, sourceTheme, currentTheme) || textColor;
            if (baseColor) {
                colorElement.setAttribute(RICH_NOTE_COLOR_BASE_ATTRIBUTE, baseColor);
                colorElement.setAttribute(RICH_NOTE_COLOR_THEME_ATTRIBUTE, sourceTheme);
            }
            target.appendChild(colorElement);
            target = colorElement;
        }
        Array.from(node.childNodes).forEach(child => appendSanitizedNode(child, target));
    };

    Array.from(template.content.childNodes).forEach(child => appendSanitizedNode(child, output));
    return output.innerHTML;
};
export const normalizeRichNoteColorMetadata = (editor, theme = getRichNoteTheme()) => {
    const currentTheme = getRichNoteTheme(theme);
    getRichNoteColoredNodes(editor).forEach(node => {
        const currentColor = normalizeRichNoteColor(getRichNoteTextColor(node));
        if (!currentColor) return;

        const storedBaseColor = normalizeRichNoteColor(node.getAttribute(RICH_NOTE_COLOR_BASE_ATTRIBUTE));
        const storedTheme = node.getAttribute(RICH_NOTE_COLOR_THEME_ATTRIBUTE);
        const hasValidMetadata = Boolean(storedBaseColor)
            && (storedTheme === 'dark' || storedTheme === 'light');
        const expectedColor = hasValidMetadata
            ? getRichNoteColorDisplayValue(storedBaseColor, storedTheme, currentTheme)
            : '';
        if (!hasValidMetadata || expectedColor.toLowerCase() !== currentColor.toLowerCase()) {
            node.setAttribute(RICH_NOTE_COLOR_BASE_ATTRIBUTE, currentColor);
            node.setAttribute(RICH_NOTE_COLOR_THEME_ATTRIBUTE, currentTheme);
        }
    });
};
export const updateRichNoteColorsForTheme = (editor, previousTheme, nextTheme) => {
    const sourceThemeFallback = getRichNoteTheme(previousTheme);
    const targetTheme = getRichNoteTheme(nextTheme);
    if (!editor || sourceThemeFallback === targetTheme) return false;

    let changed = false;
    getRichNoteColoredNodes(editor).forEach(node => {
        const currentColor = getRichNoteTextColor(node);
        const { baseColor, sourceTheme } = getRichNoteColorMetadata(node, currentColor, sourceThemeFallback);
        if (!baseColor) return;

        const displayColor = getRichNoteColorDisplayValue(baseColor, sourceTheme, targetTheme);
        if (!displayColor) return;
        const currentNormalized = normalizeRichNoteColor(currentColor);
        if (node.tagName.toUpperCase() === 'FONT') {
            node.setAttribute('color', displayColor);
        } else {
            node.style.color = displayColor;
        }
        node.setAttribute(RICH_NOTE_COLOR_BASE_ATTRIBUTE, baseColor);
        node.setAttribute(RICH_NOTE_COLOR_THEME_ATTRIBUTE, sourceTheme);
        changed = changed || currentNormalized.toLowerCase() !== displayColor.toLowerCase();
    });
    return changed;
};
export const plainTextToRichNoteHtml = (value) => {
    const container = document.createElement('div');
    container.textContent = String(value ?? '');
    return container.innerHTML.replace(/\r\n?|\n/g, '<br>');
};
export const setRichNoteEditorValue = (editor, value) => {
    if (!editor) return;
    const rawValue = String(value ?? '');
    if (!rawValue) {
        editor.innerHTML = '';
        return;
    }

    const includesRichMarkup = /<\s*\/?\s*(?:strong|b|em|i|u|br|div|p|span|font)\b/i.test(rawValue);
    editor.innerHTML = includesRichMarkup
        ? sanitizeRichNoteHtml(rawValue)
        : plainTextToRichNoteHtml(rawValue);
};
export const getRichNoteEditorValue = (editor) => {
    if (!editor) return '';
    const sanitizedHtml = sanitizeRichNoteHtml(editor.innerHTML);
    return editor.textContent.trim() || sanitizedHtml.includes('<br') ? sanitizedHtml : '';
};
export const isRichNoteEditorNode = (editor, node) => {
    return !!editor && !!node && (node === editor || editor.contains(node));
};
export const saveRichNoteSelection = (editor) => {
    const selection = window.getSelection();
    if (!editor || !selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (isRichNoteEditorNode(editor, range.startContainer) && isRichNoteEditorNode(editor, range.endContainer)) {
        richNoteSelections.set(editor, range.cloneRange());
    }
};
export const restoreRichNoteSelection = (editor) => {
    const range = richNoteSelections.get(editor);
    if (!range) return;
    const selection = window.getSelection();
    if (!selection) return;
    try {
        selection.removeAllRanges();
        selection.addRange(range);
    } catch (error) {
        richNoteSelections.delete(editor);
    }
};
export const getRichNoteToolbar = (editor) => {
    if (!editor) return null;
    return [...document.querySelectorAll('[data-rich-note-toolbar]')]
        .find(toolbar => toolbar.dataset.editorId === editor.id) || null;
};
export const updateRichNoteColorSwatch = (colorInput) => {
    const swatch = colorInput?.closest('[data-rich-note-color-control]')?.querySelector('[data-rich-note-color-swatch]');
    if (swatch && colorInput.value) {
        swatch.style.setProperty('--rich-note-color', colorInput.value);
    }
};
export const updateRichNoteColorInputForTheme = (editor, previousTheme, nextTheme) => {
    if (!editor || getRichNoteTheme(previousTheme) === getRichNoteTheme(nextTheme)) return;
    const colorInput = getRichNoteToolbar(editor)?.querySelector('[data-rich-note-color]');
    const invertedColor = invertRichNoteColor(colorInput?.value);
    if (colorInput && invertedColor) colorInput.value = invertedColor;
    updateRichNoteColorSwatch(colorInput);
};
export const updateRichNoteToolbarState = (editor) => {
    const toolbar = getRichNoteToolbar(editor);
    if (!toolbar) return;
    const disabled = editor.contentEditable !== 'true';
    const editorHasFocus = document.activeElement === editor;
    toolbar.querySelectorAll('[data-rich-note-command]').forEach(button => {
        button.disabled = disabled;
        let isPressed = false;
        if (!disabled && editorHasFocus) {
            try {
                isPressed = document.queryCommandState(button.dataset.richNoteCommand);
            } catch (error) {
                isPressed = false;
            }
        }
        button.setAttribute('aria-pressed', String(isPressed));
    });
    const colorInput = toolbar.querySelector('[data-rich-note-color]');
    const colorControl = toolbar.querySelector('[data-rich-note-color-control]');
    if (colorInput) colorInput.disabled = disabled;
    colorControl?.classList.toggle('is-disabled', disabled);
    colorControl?.setAttribute('aria-disabled', String(disabled));
    updateRichNoteColorSwatch(colorInput);
};
export const updateRichNoteToolbarStates = () => {
    [persistentNotesEl, nextSessionNotesEl].forEach(updateRichNoteToolbarState);
};
export const executeRichNoteCommand = (editor, command, value = '') => {
    if (!editor || editor.contentEditable !== 'true') return;
    editor.focus();
    restoreRichNoteSelection(editor);
    try {
        if (command === 'foreColor') {
            try {
                document.execCommand('styleWithCSS', false, true);
            } catch (error) {
                // Older WebKit builds may not expose styleWithCSS.
            }
        }
        document.execCommand(command, false, value);
    } catch (error) {
        console.warn(`Rich note command failed: ${command}`, error);
    }
    if (command === 'foreColor') normalizeRichNoteColorMetadata(editor);
    saveRichNoteSelection(editor);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    updateRichNoteToolbarState(editor);
};
export const handleRichNoteShortcut = (event) => {
    if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
    const commands = { b: 'bold', i: 'italic', u: 'underline' };
    const command = commands[event.key.toLowerCase()];
    if (!command) return;

    event.preventDefault();
    executeRichNoteCommand(event.currentTarget, command);
};
