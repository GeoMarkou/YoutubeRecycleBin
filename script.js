"use_strict"

/*
todo:
more data
pattern bug with decimal mismatch
[F] hexadecimal support
YYYY MM
[A]lphanumeric
MMMM D, YYYY
YYMMDD
MMMM DD, YYYY
DD MMM

stretch:
min/max config for random dice roll
mobile site
nice animation for reroll
ability to roll individual fields instead of "reroll all"
sorting columns
*/

/** @typedef {'YYYYMMDD'|'YYYY-MM-DD'|'YYYY MM DD'} SupportedDateFormats */
/** @typedef {'HHMMSS'|'HH:MM:SS'} SupportedTimeFormats */
/** @typedef {{ dataType: 'raw'; text: string; }|{ dataType: 'date'; format: SupportedDateFormats; min: string; max: string; }|{ dataType: 'time'; format: SupportedTimeFormats; }|{ dataType: 'number'; min: string; max: string; }} KeyVariableType */
/** @typedef {{ open: boolean; stringParts: Array<string|KeyVariableType>; }}  */

const youTubeMinDate = new Date(1975, 0, 1); // First digital camera
const genDialog = document.querySelector('dialog');

class MainPage {
    /** @type {undefined|DialogState} */
    dialogState = undefined;

    init () {
        this.dialogState = undefined;

        // Create the "Generate" button elements for each row
        /** @type {HTMLTableCellElement[]} */
        const genDivs = [ ...document.querySelectorAll('td.generate') ];
        for (let ele of genDivs) {
            // Add NSFW warning on click link
            const isNSFW = !!ele.parentElement.querySelector('td.info strong')

            // No point creating a fancy button for no variables
            if (!ele.parentElement.querySelector('td.keyphrase var')) {
                const rowKeyHTML = ele.parentElement.querySelector('td.keyphrase').innerHTML;
                const genLink = document.createElement('a');
                genLink.target = '_blank';
                genLink.innerText = 'Open ↗️';
                genLink.href = Utils.CreateYouTubeURL(rowKeyHTML);

                if (isNSFW) {
                    genLink.onclick = this.warnBeforeOpenNSFW.bind(this);
                }

                ele.appendChild(genLink);
                continue;
            }

            const genBtn = document.createElement('button');
            genBtn.onclick = this.generateLinkClick.bind(this);
            genBtn.type = 'button';
            genBtn.innerText = 'Generate ⚙️';
            ele.appendChild(genBtn);
        }

        // Create the "tooltip" for each credit
        /** @type {HTMLTableCellElement[]} */
        const creditDivs = [ ...document.querySelectorAll('td.credit') ];
        for (let ele of creditDivs) {
            if (!ele.innerText) {
                continue;
            }

            ele.title = ele.innerText;
        }
    }

    /** @param {PointerEvent} ev */
    warnBeforeOpenNSFW(ev) {
        if (!confirm('This link is NSFW, are you sure you want to open it?')) {
            event.stopImmediatePropagation();
            ev.preventDefault();
            return false;
        }
    }

    /** @param {PointerEvent} ev */
    generateLinkClick (ev) {
        /** @type {HTMLElement} */
        const target = ev.currentTarget;

        // Add NSFW warning on click link
        const isNSFW = !!target.parentElement.querySelector('td.info strong')
        if (isNSFW) {
            if (this.warnBeforeOpenNSFW(ev) === false) {
                return false;
            }
        }

        /** @type {Array<KeyVariableType>} */
        let phraseParts = [];
        const rowKey = target.closest('tr').querySelector('td.keyphrase');
        for (let ele of rowKey.childNodes) {
            if (ele.nodeType === Node.TEXT_NODE) {
                phraseParts.push({ dataType: 'raw', text: ele.nodeValue });
                continue;
            }

            switch (ele.tagName.toLowerCase()) {
                case 'var':
                    /** @type {HTMLElement} */
                    const htmlEle = ele;
                    phraseParts.push(Utils.detectVariableType(htmlEle.innerText, htmlEle.dataset['min'], htmlEle.dataset['max']));
                    break;
                default:
                    alert('Invalid tag ' + ele.tagName);
                    break;
            }
        }

        if (!phraseParts.length) {
            alert('Invalid keyphrase ' + rowKey.innerHTML)
            return;
        }
        
        const genDialogClose = genDialog.querySelector('button.close');
        this.dialogState = new DialogState(phraseParts);
        genDialog.onclose = () => delete this.dialogState;
        genDialogClose.onclick = () => genDialog.close();
    };

    /** @param {PointerEvent} ev */
    openLinkClick (ev) {
        /** @type {HTMLElement} */
        const target = ev.currentTarget;
        const row = target.closest('tr');
        window.open(Utils.CreateYouTubeURL(row.querySelector('td.keyphrase').innerText));
    };
}

class DialogState {
    /** @type {Array<KeyVariableType>} */
    parts = undefined;

    /** @type {HTMLFormElement} */
    formEle = genDialog.querySelector('form');

    /** @type {HTMLDivElement} */
    outputEle = genDialog.querySelector('output');

    /** @type {HTMLAnchorElement} */
    youtubeLinkEle = genDialog.querySelector('.youtubeLink');

    /** @type {HTMLButtonElement} */
    backBtn = genDialog.querySelector('.back');

    /** @type {HTMLButtonElement} */
    closeBtn = genDialog.querySelector('.close');

    /** @type {HTMLButtonElement} */
    rerollBtn = genDialog.querySelector('.reroll');

    /** @type {HTMLButtonElement} */
    nextBtn = genDialog.querySelector('.next');

    /** @type {HTMLDivElement} */
    page1 = genDialog.querySelector('.page1');

    /** @type {HTMLDivElement} */
    page2 = genDialog.querySelector('.page2');

    /** @param {Array<KeyVariableType>} parts */
    constructor(parts) {
        this.parts = parts;

        this.rerollBtn.onclick = this.reroll.bind(this);
        this.nextBtn.onclick = this.generateOutput.bind(this);
        this.backBtn.onclick = () => this.setOutputState('default');

        // Create the editable sentence phrase
        const contentEle = genDialog.querySelector('.inputs');
        contentEle.innerHTML = '';

        for (let i = 0; i < parts.length; i++) {
            const ele = parts[i];
            switch (ele.dataType) {
                case 'date': {
                    const newEle = document.createElement('input');
                    newEle.dataset['index'] = i;
                    newEle.ariaLabel = newEle.placeholder = 'Date';
                    newEle.type = 'date';
                    newEle.min = Utils.formatDate(youTubeMinDate, 'YYYY-MM-DD');
                    newEle.max = Utils.formatDate(new Date(), 'YYYY-MM-DD');
                    newEle.required = true;
                    newEle.onkeydown = () => this.setOutputState.bind(this)('default');
                    newEle.onchange = this.handleInputChange.bind(this);
                    contentEle.appendChild(newEle);
                    break;
                }
                case 'time': {
                    const newEle = document.createElement('input');
                    newEle.dataset['index'] = i;
                    newEle.ariaLabel = newEle.placeholder = 'Time';
                    newEle.type = 'time';
                    newEle.step = ele.format.includes('S') ? '1' : ele.format.includes('M') ? '60' : '3600';
                    newEle.required = true;
                    newEle.onkeydown = () => this.setOutputState.bind(this)('default');
                    newEle.onchange = this.handleInputChange.bind(this);
                    contentEle.appendChild(newEle);
                    break;
                }
                case 'number': {
                    const maxLength = ele.max.toString().length;
                    const newEle = document.createElement('input');
                    newEle.dataset['index'] = i;
                    newEle.ariaLabel = newEle.placeholder = `${ele.min}-${ele.max}`;
                    newEle.style.minWidth = `${maxLength + 2}em`;
                    newEle.type = 'text';
                    newEle.inputMode = 'numeric';
                    newEle.pattern = `[0-9]{${maxLength}}`
                    newEle.maxLength = maxLength;
                    newEle.required = true;
                    newEle.onkeydown = () => this.setOutputState.bind(this)('default');
                    newEle.onchange = this.handleInputChange.bind(this);
                    contentEle.appendChild(newEle);
                    break;
                }
                case 'raw': {
                    const newEle = document.createElement('span');
                    newEle.innerText = ele.text;
                    contentEle.appendChild(newEle);
                    break;
                }
                default: {
                    alert(`Unsupported data ${JSON.stringify(ele)}`);
                    break;
                }
            }
        }

        this.setOutputState('default');
        this.formEle.onsubmit = (e) => e.preventDefault();
        genDialog.showModal();
    }

    /** @param {'default'|'youtubeLink'|'validationErrors'} state */
    setOutputState(state) {
        this.outputEle.hidden = state !== 'validationErrors';

        // Page1 vs Page2 buttons and visuals
        if (state === 'youtubeLink') {
            this.page1.hidden = true;
            this.nextBtn.hidden = true;
            this.rerollBtn.hidden = true;

            this.youtubeLinkEle.hidden = false;
            this.page2.hidden = false;
            this.backBtn.hidden = false;
        }
        else {
            this.youtubeLinkEle.hidden = true;
            this.page2.hidden = true;
            this.backBtn.hidden = true;

            this.page1.hidden = false;
            this.nextBtn.hidden = false;
            this.rerollBtn.hidden = false;
        }
    }

    generateOutput() {
        if (!this.formEle.reportValidity()) {
            this.setOutputState('validationErrors');
            return;
        }

        let newParams = [];
        for (let i = 0; i < this.parts.length; i++) {
            /** @type {HTMLInputElement} */
            const inputEle = genDialog.querySelector(`input[data-index="${i}"]`);
            const ele = this.parts[i];
            switch (ele.dataType) {
                case 'date': {
                    const dateVal = new Date(inputEle.value);
                    const formatVal = Utils.formatDate(dateVal, ele.format);
                    newParams.push(formatVal);
                    break;
                }
                case 'time': {
                    const parts = inputEle.value.split(':');
                    const dateVal = new Date(2026, 0, 1, ...parts);
                    const formatVal = Utils.formatTime(dateVal, ele.format);
                    newParams.push(formatVal);
                    break;
                }
                case 'raw': {
                    newParams.push(ele.text);
                    break;
                }
                case 'number': {
                    newParams.push(inputEle.value);
                    break;
                }
                default: {
                    alert(`Unsupported data ${JSON.stringify(ele)}`);
                    break;
                }
            }
        }

        // We don't add spaces because this should already be included in the keyphrase
        const newURL = Utils.CreateYouTubeURL(newParams.join(''));
        this.youtubeLinkEle.href = this.youtubeLinkEle.innerText = newURL;
        this.setOutputState('youtubeLink');
    }

    reroll() {
        for (let i = 0; i < this.parts.length; i++) {
            /** @type {HTMLInputElement} */
            const inputEle = genDialog.querySelector(`input[data-index="${i}"]`);
            const ele = this.parts[i];
            switch (ele.dataType) {
                case 'date': {
                    const result = Utils.generateRandomDate(ele.min ? new Date(ele.min) : youTubeMinDate, ele.max ? new Date(ele.max) : new Date());
                    ele.value = inputEle.value = Utils.formatDate(result, 'YYYY-MM-DD');
                    break;
                }
                case 'time': {
                    const result = Utils.generateRandomTime(youTubeMinDate, new Date());
                    ele.value = inputEle.value = Utils.formatTime(result, 'HH:MM:SS');
                    break;
                }
                case 'number': {
                    const result = Utils.generateRandomNumber(Number.parseInt(ele.min), Number.parseInt(ele.max));
                    const minNumberOfDigits = ele.min.length;
                    ele.value = inputEle.value = result.toString().padStart(minNumberOfDigits, '0');
                    break;
                }
                case 'raw': {
                    break;
                }
                default: {
                    alert(`Unsupported data ${JSON.stringify(ele)}`);
                    break;
                }
            }
        }

        this.generateOutput();
    }

    /** @param {InputEvent} e */
    handleInputChange(e) {
        /** @type {HTMLInputElement} */
        const ele = e.currentTarget;
        const index = Number.parseInt(ele.dataset['index']);
        if (Number.isNaN(index) || !Number.isInteger(index) || index < 0 || index > this.parts.length) {
            e.preventDefault();
            return false;
        }

        this.setOutputState('default');
    }
}

class Utils {
    /**
     * @param {string} v;
     * @param {string?} min;
     * @param {string?} max;
     * @returns {KeyVariableType};
     */
    static detectVariableType (v, min, max) {
        switch (v) {
            case 'YYYYMMDD':
            case 'YYYY MM DD':
                return { dataType: 'date', format: v, min: min, max: max };
            case 'HHMMSS':
                return { dataType: 'time', format: v };
            case 'X':
            case 'XX':
            case 'XXX':
            case 'XXXX':
            case 'XXXXX':
            case 'XXXXXX':
            case 'XXXXXXX':
            case 'XXXXXXXX':
            case 'XXXXXXXXX':
            case 'XXXXXXXXXX':
                return { dataType: 'number', min: min ?? '0', max: max ?? v.replaceAll('X', 9) };
            default:
                return { dataType: 'raw', text: v };
        }
    }

    /** @param {Date} d; @param {SupportedDateFormats} format */
    static formatDate (d, format) {
        const year = d.getFullYear().toString();
        const month = (d.getMonth() + 1).toString();
        const day = d.getDate().toString();

        switch (format) {
            case 'YYYYMMDD':
                return `${year.padStart(4, '0')}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
            case 'YYYY-MM-DD':
                return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            case 'YYYY MM DD':
                return `${year.padStart(4, '0')} ${month.padStart(2, '0')} ${day.padStart(2, '0')}`;
            default:
                alert(`Unsupported date format ${format}. Defaulting to YYYYMMDD`);
                return `${year.padStart(4, '0')}${month.padStart(2, '0')}${day.padStart(2, '0')}`;
        }
    }

    /** @param {Date} d; @param {SupportedTimeFormats} format */
    static formatTime (d, format) {
        const hour = d.getHours().toString();
        const minute = d.getMinutes().toString();
        const second = d.getSeconds().toString();

        switch (format) {
            case 'HHMMSS':
                return `${hour.padStart(2, '0')}${minute.padStart(2, '0')}${second.padStart(2, '0')}`;
            case 'HH:MM:SS':
                return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:${second.padStart(2, '0')}`;
            default:
                alert(`Unsupported time format ${format}. Defaulting to HHMMSS`);
                return `${hour.padStart(2, '0')}${minute.padStart(2, '0')}${second.padStart(2, '0')}`;
        }
    }

    /** @param {Date} min; @param {Date} max */
    static generateRandomDate (min, max) {
        return new Date(Utils.generateRandomNumber(min.getTime(), max.getTime()));
    }

    static generateRandomTime () {
        return new Date(2026, 0, 1, Utils.generateRandomNumber(0, 23), Utils.generateRandomNumber(0, 59), Utils.generateRandomNumber(0, 59));
    }

    /** @param {number} min; @param {number} max */
    static generateRandomNumber (min, max) {
        return Math.round(min + Math.random() * (max - min));
    }

    /** @param {string} search_query */
    static CreateYouTubeURL (search_query) {
        const newLink = new URL('https://www.youtube.com/results');
        newLink.searchParams.append('search_query', search_query);
        return newLink.toString();
    }
}

new MainPage().init();