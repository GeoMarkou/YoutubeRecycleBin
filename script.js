"use_strict"

/*
todo:
copy more data from doc
with xxxx formats, should we always pad start with 0's? unknown, needs confirmation

stretch:
min/max config for random dice roll
mobile site
nice animation for reroll
ability to roll individual fields instead of "reroll all"
sorting columns
*/

/** @typedef {{ dataType: 'raw'; text: string; }} KeyVariableType_Raw */
/** @typedef {{ dataType: 'date'; format: string; min: string; max: string; }} KeyVariableType_Date */
/** @typedef {{ dataType: 'time'; format: string; }} KeyVariableType_Time */
/** @typedef {{ dataType: 'number'; min: string; max: string; }} KeyVariableType_Number */
/** @typedef {{ dataType: 'hex'; min: string; max: string; }} KeyVariableType_Hexadecimal */
/** @typedef {{ dataType: 'alpha'; min: string; max: string; }} KeyVariableType_Alphabetical */
/** @typedef {KeyVariableType_Raw|KeyVariableType_Date|KeyVariableType_Time|KeyVariableType_Number|KeyVariableType_Hexadecimal|KeyVariableType_Alphabetical} KeyVariableType */

const monthList = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
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
                    newEle.step = ele.format.includes('S') ? '1' : ele.format.includes('m') ? '60' : '3600';
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
                    newEle.maxLength = maxLength;
                    newEle.required = true;
                    newEle.onkeydown = () => this.setOutputState.bind(this)('default');
                    newEle.onchange = this.handleInputChange.bind(this);
                    contentEle.appendChild(newEle);
                    break;
                }
                case 'hex': {
                    const maxLength = ele.max.toString().length;
                    const newEle = document.createElement('input');
                    newEle.dataset['index'] = i;
                    newEle.ariaLabel = newEle.placeholder = `${ele.min}-${ele.max}`;
                    newEle.style.minWidth = `${maxLength + 2}em`;
                    newEle.type = 'text';
                    newEle.maxLength = maxLength;
                    newEle.required = true;
                    newEle.onkeydown = () => this.setOutputState.bind(this)('default');
                    newEle.onchange = this.handleInputChange.bind(this);
                    contentEle.appendChild(newEle);
                    break;
                }
                case 'alpha': {
                    const maxLength = ele.max.toString().length;
                    const newEle = document.createElement('input');
                    newEle.dataset['index'] = i;
                    newEle.ariaLabel = newEle.placeholder = `${ele.min}-${ele.max}`;
                    newEle.style.minWidth = `${maxLength + 2}em`;
                    newEle.type = 'text';
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
                case 'hex': {
                    newParams.push(inputEle.value);
                    break;
                }
                case 'alpha': {
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
                    ele.value = inputEle.value = Utils.formatTime(result, 'HH:mm:SS');
                    break;
                }
                case 'number': {
                    const result = Utils.generateRandomNumber(Number.parseInt(ele.min), Number.parseInt(ele.max));
                    const minNumberOfDigits = ele.min.length;
                    ele.value = inputEle.value = result.toString().padStart(minNumberOfDigits, '0');
                    break;
                }
                case 'hex': {
                    const result = Utils.generateRandomHex(ele.min, ele.max);
                    const minNumberOfDigits = ele.min.length;
                    ele.value = inputEle.value = result.toString().padStart(minNumberOfDigits, '0');
                    break;
                }
                case 'alpha': {
                    const result = Utils.generateRandomAlpha(ele.min, ele.max);
                    const minNumberOfDigits = ele.min.length;
                    ele.value = inputEle.value = result.toString().padStart(minNumberOfDigits, 'A');
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
        if (v.match(/Y|M|D/)) {
            return { dataType: 'date', format: v, min: min, max: max };
        }
        else if (v.match(/H|m|S/)) {
            return { dataType: 'time', format: v };
        }
        else if (v.match('X')) {
            return { dataType: 'number', min: min ?? '0', max: max ?? v.replaceAll('X', 9) };
        }
        else if (v.match('F')) {
            return { dataType: 'hex', min: min ?? '0', max: max ?? v.replaceAll('F', 'F') };
        }
        else if (v.match('A')) {
            return { dataType: 'alpha', min: min ?? 'A', max: max ?? v.replaceAll('A', 'Z') };
        }
        else {
            return { dataType: 'raw', text: v };
        }
    }

    /** @param {Date} d; @param {string} format */
    static formatDate (d, format) {
        const year = d.getFullYear().toString();
        const month = (d.getMonth() + 1).toString();
        const day = d.getDate().toString();

        // Year
        let result = format;
        result = result.replaceAll('YYYY', year);
        result = result.replaceAll('YYY', year.substring(1, 4));
        result = result.replaceAll('YY', year.substring(2, 4));
        result = result.replaceAll('YY', year.substring(3, 4));

        // Month
        result = result.replaceAll('MMMM', monthList[month - 1]);
        result = result.replaceAll('MMM', monthList[month - 1].substring(0, 3));
        result = result.replaceAll('MM', month.padStart(2, '0'));
        result = result.replaceAll('M', month);

        // Day
        result = result.replaceAll('DD', day.padStart(2, '0'));
        result = result.replaceAll('D', day);

        return result;
    }

    /** @param {Date} d; @param {SupportedTimeFormats} format */
    static formatTime (d, format) {
        const hour = d.getHours().toString();
        const minute = d.getMinutes().toString();
        const second = d.getSeconds().toString();

        // Hour
        let result = format;
        result = result.replaceAll('HH', hour.padStart(2, '0'));
        result = result.replaceAll('H', hour);

        // Minute
        result = result.replaceAll('mm', minute.padStart(2, '0'));
        result = result.replaceAll('m', minute);

        // Second
        result = result.replaceAll('SS', second.padStart(2, '0'));
        result = result.replaceAll('S', second);

        return result;
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

    /** @param {string} min; @param {string} max */
    static generateRandomHex (min, max) {
        const minInt = Number.parseInt(min, 16);
        const maxInt = Number.parseInt(max, 16);
        const rand = Utils.generateRandomNumber(minInt, maxInt);
        return rand.toString(16);
    }

    /** @param {string} min; @param {string} max */
    static generateRandomAlpha (min, max) {
        let result = '';
        for (let i = 0; i < max.length; i++) {
            const minInt = min.charCodeAt(i);
            const maxInt = max.charCodeAt(i);
            const rand = Utils.generateRandomNumber(minInt, maxInt);
            result += String.fromCharCode(rand);
        }
        return result;
    }

    /** @param {string} search_query */
    static CreateYouTubeURL (search_query) {
        const newLink = new URL('https://www.youtube.com/results');
        newLink.searchParams.append('search_query', search_query);
        return newLink.toString();
    }
}

class AdHoc {
    // Archive of script used to scrape 90% of data from the google doc
    ScrapeGoogleDoc() {
        [ ...document.querySelectorAll('.list') ].map((ele, i) => `
            <tbody>
                <tr>
                    <th scope="rowgroup" colspan="5"><h3 id="tbl-${i}">${ele.previousElementSibling.innerText}</h3></th>
                </tr>
                ${ [ ...ele.querySelectorAll('.c8') ].map(ele => `
                <tr>
                    <td class="keyphrase">${[ ...ele.querySelectorAll('.c1:not(.c3):not(.c10):not(.c5):not(.c13):not(.c6)') ].map(ele => ele.classList.contains('c7') ? `<var>${ele.innerText.replaceAll('\n', '')}</var>` : ele.innerText.replaceAll('\n', '')).join('').trim()}</td>
                    <td class="example"></td>
                    <td class="info">${[ ...ele.querySelectorAll('.c3, .c5, .c6, .c14') ].map(ele => ele.innerText.trim()).join(' - ').trim()}</td>
                    <td class="credit">${[ ...ele.querySelectorAll('.c10 a') ].map(ele => `<a target="_blank" href="${(new URL(ele.href)).searchParams.get('q')}">${ele.innerText.trim()}</a>`)}</td>
                    <td class="generate"></td>
                </tr>`).join('\n') }
            </tbody>`).join('\n');
    }

    // Find all the rows that have multiple variables inside them - sometimes a mistake
    FindMultivarFunctions() {
        [ ...document.querySelectorAll('td:has(var~var)') ].map(ele => ele.outerHTML).join('\n')
    }

    // The google doc is a bit weird that sometimes it merges multiple paragraphs into one
    // and our tool script above would treat it as 1 really long weird search... this finds
    // those elements so we can manually fix it. There was like 40 ish
    FindMergedOriginalParagraphs() {
        [ ...document.querySelectorAll('.c8') ].filter(ele => [ ...ele.children ].filter(ele => ele.innerText.trim() && ele.className === 'c1').length > 1)
    }
}

new MainPage().init();