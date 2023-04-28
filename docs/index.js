"use strict";
const ELEMENTS = 'Cu,铜;Ag,银;Ni,镍;Ge,锗;Bi,铋';
const DEFAULT_PERCENTS = [
    {Cu: 0.6, Ag: 0, Ni: 0.02, Ge: 0, Bi: 0},
    {Cu: 0.6, Ag: 0, Ni: 0.06, Ge: 0, Bi: 0},
    {Cu: 0, Ag: 0, Ni: 0.02, Ge: 0, Bi: 0},
    {Cu: 0, Ag: 0, Ni: 0.06, Ge: 0, Bi: 0},
    {Cu: 0, Ag: 0.3, Ni: 0, Ge: 0, Bi: 0},
    {Cu: 0, Ag: 0.3, Ni: 0, Ge: 0, Bi: 0.1},
    {Cu: 0.6, Ag: 0.3, Ni: 0, Ge: 0, Bi: 0},
    {Cu: 0.6, Ag: 0.3, Ni: 0, Ge: 0, Bi: 0.1},
    {Cu: 0.5, Ag: 3, Ni: 0, Ge: 0, Bi: 0},
    {Cu: 0, Ag: 3, Ni: 0.06, Ge: 0, Bi: 0},
].map(o => ({
    c: ELEMENTS
        .split(';')
        .map(p => p.split(',')[0])
        .map(p => o[p] ? p + o[p] : '')
        .join(''),
    v: o,
})).map(o => (o.n = o.c) && o);
DEFAULT_PERCENTS.unshift({c: "", n: "请录入占比后点保存规格", v: null});
const URL_CONFIG = {
    'MICROSOFT': {
        '{': '`left. `begin{cases} {',
        '}': '} `end{cases} `right.',
        '(': '`left(',
        ')': '`right)',
        '\n': '} `` {',
        'url': 'https://mathsolver.microsoft.com/zh/solve-problem/',
        'toUrlParams': function (list) {
            return `${URL_CONFIG.MICROSOFT.url}${URL_CONFIG.MICROSOFT["{"]} \
${list.map(o => o
                .replace('(', URL_CONFIG.MICROSOFT["("])
                .replace(')', URL_CONFIG.MICROSOFT[")"]))
                .join(` ${URL_CONFIG.MICROSOFT["\n"]} `)} \
${URL_CONFIG.MICROSOFT["}"]}`;
        },
    },
    'NUMBER_EMPIRE': {
        'url': 'https://zh.numberempire.com/equationsolver.php',
        'toUrlParams': function (list, usedElements) {
            return `${URL_CONFIG.NUMBER_EMPIRE.url}?function=\
${encodeURIComponent(list.join(','))}&var=${usedElements.join(',')}&result_type=true`;
        }
    },
};
const DESCRIPTION = [
    ['支持锡原料和其他合金半成品（如铜合金、银合金）的配比计算；支持半成品、成品（如上次多余的成品）和其他合金半成品的配比计算。',],
    ['操作流程：', [
        ['填写<r>原材料</r>重量；如果是锡原料，其他元素占比填0；如果是成品、半成品，按实际情况填其他元素占比即可；',],
        ['如果有<r>多种</r>原材料，点击原料设置后面的<b> + </b>，增加原材料；如果需要删除某个原材料，选中想删除的原材料，点右上角的<b> × </b>；',],
        ['矩形框里填<r>成品</r>的元素占比；填好之后可以点 <b>保存规格</b>，取个名字点确定，之后可以在 <b>成品规格</b> 里选名字自动带出元素占比；',],
        ['下面填各个锡包合金（<r>半成品</r>）的元素占比，填锡以外的元素的占比；',],
        ['点 <b>计算配比</b>，会在弹出的页面显示各个锡包合金需要加多少重量；弹出页面从左到右的数字，对应这个页面从上到下的元素。',],
    ]],
    ['每次填好的数字，下次打开页面会自动带出，不需要重新填写。'],
    ['也可以填写<r>数字计算表达式</r>（支持 <b>+ - * / ( )</b> 这些符号），然后按回车键，会自动计算结果。'],
    ['<b>计算配比</b> 右边可以选择不同的页面计算（如果某个页面打不开请试下其他的）'],
];
const LOG_DAYS = 14 * 24 * 60 * 60 * 1000;
const PREFIX = '__AlloyPercentCalculator_';
const NUMBER_REG = /^\d+(\.\d+)?$/;
const UNKNOWS = 'xyzuvw';
var SECTIONS, CURR_TAB, ORIGINS;

function set(k, v) {
    localStorage.setItem(PREFIX + k, v);
}

function get(k) {
    return localStorage.getItem(PREFIX + k);
}

function round(number, length) {
    return +(number / 1).toFixed(length || 8);
}

function saveInput(obj) {
    calculateInput(obj);
    if (obj.classList.contains('followTab')) {
        let element = obj.name.substr(0, 2);
        let currTab = +obj.name.match(/\d+$/)[0];
        ORIGINS[currTab - 1][element] = obj.value;
        set('ORIGINS', JSON.stringify(ORIGINS));
    } else {
        set(obj.name || obj.id, obj.value);
    }
}

function initTabs() {
    let elements = ELEMENTS.split(';').map(o => o.split(',')[0]);
    ORIGINS = get('ORIGINS');
    if (!ORIGINS) {
        ORIGINS = [elements.reduce((a, b) => (a[b] = null) || a, {})];
        set('ORIGINS', JSON.stringify(ORIGINS));
    } else {
        ORIGINS = JSON.parse(ORIGINS);
    }
    CURR_TAB = get('CURR_TAB');
    CURR_TAB = !CURR_TAB ? 1 : +CURR_TAB;
    set('CURR_TAB', CURR_TAB);
    [...document.querySelectorAll('input.followTab')].forEach(o => o.name = `${o.id}_${CURR_TAB}`);
    document.querySelector('td#choose').innerHTML = '';
    for (let i = 0; i < ORIGINS.length + 2; i++) {
        addTab(i + 1);
    }
}

function addTab(i) {
    let td = document.querySelector('td#choose');
    td.innerHTML += `<a href="javascript:void(0);" class="${i === CURR_TAB ? 'choose' : ''}" \
style="float:${i >= ORIGINS.length + 2 ? 'right' : 'left'}" \
onmouseover="tabOver(this,true)" onmouseout="tabOver(this,false)" onclick="tabClick(this)">\
${i <= ORIGINS.length ? i : i > ORIGINS.length + 1 ? '×' : '+'}</a>`;
}

function tabOver(obj, In) {
    if (In) {
        obj.classList.add('over');
    } else {
        obj.classList.remove('over');
    }
}

function tabClick(obj) {
    let type = obj.innerHTML;
    switch (type) {
        case'+':
            let elements = ELEMENTS.split(';').map(o => o.split(',')[0]);
            ORIGINS.push(elements.reduce((a, b) => (a[b] = null) || a, {}));
            set('ORIGINS', JSON.stringify(ORIGINS));
            set('CURR_TAB', ORIGINS.length);
            break;
        case'×':
            if (ORIGINS.length <= 1) {
                alert('最后一组原料设置不能删除！');
                return false;
            }
            if (!confirm(`确定删除第 ${CURR_TAB} 组原料设置？`)) {
                return true;
            }
            ORIGINS.splice(CURR_TAB - 1, 1);
            set('ORIGINS', JSON.stringify(ORIGINS));
            set('CURR_TAB', Math.min(CURR_TAB, ORIGINS.length));
            break;
        default:
            set('CURR_TAB', +type);
            break;
    }
    initTabs();
    initValue('tabOnly');
}

function initInput() {
    let list = ELEMENTS.split(';');
    list.reverse().forEach((o, i) => {
        let [code, name] = o.split(',');
        document.querySelector('tr#originTr').outerHTML +=
            `<tr>
                <td class="l${i ? '' : ' b'}">${name}元素含量：</td>
                <td class="r${i ? '' : ' b'}">
                    <input name="${code}Origin_${CURR_TAB}" id="${code}Origin" class="followTab" onblur="saveInput(this)" 
                    type="text" placeholder="填【原料】的元素含量"/> Kg
                </td>
            </tr>`;
        document.querySelector('tr#alloyTr').outerHTML +=
            `<tr>
                <td class="l${i === list.length - 1 ? ' t' : ''}">${name}合金占比：</td>
                <td class="r${i === list.length - 1 ? ' t' : ''}">
                    <input name="${code}Percent" onblur="saveInput(this)" type="text" placeholder="填【半成品】的元素占比"/> %
                </td>
            </tr>`;
        document.querySelector('tr#elementTr').outerHTML +=
            `<tr>
                <td class="l">${name}元素占比：</td>
                <td class="r">
                    <input name="${code}Element" onblur="saveInput(this)" type="text" placeholder="填【成品】的元素占比"/> %
                </td>
            </tr>`;
    });
    [...document.querySelectorAll('input[type=text]')].forEach(o => {
        o.addEventListener('keydown', o => {
            if (o.keyCode !== 13) {
                return;
            }
            calculateInput(o.target);
        });
    });
}

function calculateInput(element) {
    if (element.type !== 'text') {
        return;
    }
    let v;
    try {
        v = eval(element.value);
    } catch (e) {
        v = null;
    }
    if (v && !isNaN(+v)) {
        element.value = round(v);
    }
}

function initSections() {
    SECTIONS = get('sections')
    if (!SECTIONS) {
        SECTIONS = JSON.parse(JSON.stringify(DEFAULT_PERCENTS));
        set('sections', JSON.stringify(SECTIONS));
    } else {
        SECTIONS = JSON.parse(SECTIONS);
        for (let i = 1; i < DEFAULT_PERCENTS.length; i++) {
            let idx = SECTIONS.findIndex(o => o.n === DEFAULT_PERCENTS[i].n);
            if (idx > -1) {
                SECTIONS.splice(idx, 1);
            }
            SECTIONS.splice(i, 0, DEFAULT_PERCENTS[i]);
        }
    }
    document.querySelector('select#selectAlloy').innerHTML =
        SECTIONS.reduce((a, b) => a + `<option value="${b.c}">${b.n}</option>`, '');
}

function initValue(param) {
    let inputs = document.querySelectorAll('input[onblur]');
    let selects = document.querySelectorAll('select[onchange]');
    let todo;
    if (param === 'selectOnly') {
        todo = [...selects];
    } else if (param === 'tabOnly') {
        todo = [...inputs].filter(o => o.classList.contains('followTab'));
    } else {
        todo = [...inputs, ...selects];
    }
    todo.forEach(o => {
        if (o.classList.contains('followTab')) {
            let element = o.name.substr(0, 2);
            let currTab = +o.name.match(/\d+$/)[0];
            o.value = ORIGINS?.[currTab - 1]?.[element] || '';
        } else {
            o.value = get(o.name || o.id) || '';
        }
    });
}

function initDescription(result, level, array, parent) {
    if (!result && !level && !array && !parent) {
        result = [];
        level = 1;
        array = DESCRIPTION;
        parent = '';
    }
    for (let i = 0; i < array.length; i++) {
        result.push(`<tr>
<td ${level > 1 ? `class="p-l-${20 * (level - 1)}"` : ''}
>${parent}${i + 1}.${array[i][0]
            .replaceAll('<r>', '<font color="red">')
            .replaceAll('</r>', '</font>')
            .replaceAll('<b>', '<span style="border:black solid 1px">')
            .replaceAll('</b>', '</span>')}</td></tr>`);
        if (level >= 1 && array[i][1] && array[i][1].length > 0) {
            initDescription(result, level + 1, array[i][1], `${parent}${i + 1}.`);
        }
    }
    if (level <= 1) {
        document.querySelector('table#description').innerHTML += result.join('');
    }
    return result;
}

function initAuthor() {
    let author = document.querySelector('span#author');
    author.style.right = '0';
    author.style.top = window.screen.height + 'px';
    author.style.display = '';
}

function initLogo() {
    let screenWidth = document.body.clientWidth;
    let logoWidth = ((screenWidth - 300) / 2) * 0.6;
    let logoLeft = ((screenWidth - 300) / 2) * 0.2;
    let logo = document.getElementById('logo');
    logo.style.width = `${logoWidth}px`;
    logo.style.left = `${logoLeft}px`;
    logo.style.display = '';
}

function init() {
    initTabs();
    initInput();
    initSections();
    initValue();
    initDescription();
    initAuthor();
    initLogo();
    document.getElementById('mainTable').classList.remove('hide');
}

window.onload = init;

function saveAlloy() {
    let name = prompt('请为这一组元素占比起个名称（成品规格名称）');
    if (name == null) {
        return true;
    }
    if (name.trim() === '') {
        alert('请输入名称！');
        return false;
    }
    let idx = DEFAULT_PERCENTS.findIndex(o => o.n === name);
    if (idx > -1) {
        alert(`默认规格【${name}】不能更新！`);
        return false;
    }
    idx = SECTIONS.findIndex(o => o.n === name);
    if (idx > -1 && !confirm(`已存在名为【${name}】的成品规格，是否更新？`)) {
        return false;
    }
    let v = getPercents();
    let section = {c: name, n: name, v: v};
    if (idx > -1) {
        SECTIONS[idx] = section;
    } else {
        SECTIONS.push(section);
    }
    set('sections', JSON.stringify(SECTIONS));
    initSections();
    set('selectAlloy', section.c);
    initValue('selectOnly');
    alert(`成品规格【${name}】已保存，下拉选择后自动带出元素占比`);
    return true;
}

function getPercents() {
    let elementList = ELEMENTS.split(';').map(o => o.split(',')[0]);
    let result = elementList.reduce((a, b) => {
        let value = document.querySelector(`input[name=${b}Element]`).value;
        if (value && +value) {
            a[b] = +value;
        } else {
            a[b] = 0;
        }
        return a;
    }, {});
    return result;
}

function deleteAlloy() {
    let name = document.querySelector('select#selectAlloy')?.value;
    if (!name) {
        alert('请先选择一个成品规格再进行删除！');
        return false;
    }
    if (DEFAULT_PERCENTS.findIndex(o => o.n === name) > -1) {
        alert(`默认规格【${name}】不能删除！`)
        return false;
    }
    if (!confirm(`确定删除名为【${name}】的成品规格？`)) {
        return false;
    }
    SECTIONS = SECTIONS.filter(o => o.c !== name);
    set('sections', JSON.stringify(SECTIONS));
    initSections();
    set('selectAlloy', '');
    initValue('selectOnly');
    return true;
}

function showPercents(select) {
    let name = select.value;
    if (!name) {
        return true;
    }
    let section = SECTIONS.filter(o => o.c === name)?.['0'];
    if (!section) {
        return false;
    }
    for (let k in section.v) {
        if (typeof k != 'string' || k.trim().length <= 0) {
            continue;
        }
        let obj = document.querySelector(`input[name=${k}Element]`);
        if (!obj) {
            continue;
        }
        obj.value = section.v[k];
        obj.focus();
        obj.blur();
    }
    return true;
}

function calculate() {
    try {
        let origin = 0, origins = [];
        for (let i = 0; i < ORIGINS.length; i++) {
            origin += checkNumberTab('Sn', '原材料重量', i);
        }
        let elements = ELEMENTS.split(';');
        let alloys = [];
        let codes = elements.map(o => o.split(',')[0]);
        let names = elements.map(o => o.split(',')[1]);
        for (let i = 0; i < codes.length; i++) {
            origins[i] = 0;
            for (let j = 0; j < ORIGINS.length; j++) {
                origins[i] += checkNumberTab(codes[i], `原料${names[i]}元素含量`, j);
            }
            elements[i] = checkNumber(`input[name=${codes[i]}Element]`, `成品${names[i]}元素占比`);
            elements[i] = round(elements[i] / 100);
            alloys[i] = checkNumber(`input[name=${codes[i]}Percent]`, `${names[i]}合金占比`);
            alloys[i] = round(alloys[i] / 100);
        }
        let equationSet = [], usedElements = [];
        for (let i = 0; i < codes.length; i++) {
            if (elements[i] <= 0) {
                continue;
            }
            usedElements.push(UNKNOWS[i]);
            equationSet.push(`(${origin}\${usedElements})*\
${elements[i]}=\
${alloys[i]}*\
${UNKNOWS[i]}\
${origins[i] > 0 ? `+${origins[i]}` : ''}`);
        }
        let list = equationSet.map(o => o.replace('${usedElements}', usedElements.map(m => `+${m}`).join('')));
        let type = document.querySelector('select#calculateType')?.value || 'NUMBER_EMPIRE';
        let url = URL_CONFIG[type].toUrlParams(list, usedElements);
        saveLog(list);
        window.open(url);
    } catch (e) {
        console.log(e);
        return false;
    }
}

function checkNumber(selector, name) {
    let obj = document.querySelector(selector);
    let value = obj?.value;
    if (value == null || !value.match(NUMBER_REG)) {
        alert(`${name}填写不正确，需填写数字！`);
        obj?.focus();
        obj?.select();
        throw new Error(`Number format error for element {selector: '${selector}', name: '${name}'}`);
    }
    return +value;
}

function checkNumberTab(element, name, i) {
    let value = ORIGINS[i]?.[element];
    if (value == null || !value.match(NUMBER_REG)) {
        alert(`第 ${+i + 1} 页${name}填写不正确，需填写数字！`);
        let aList = document.querySelectorAll('#choose a');
        let a = [...aList].filter(o => o.innerHTML.trim() === '' + (i + 1))?.[0];
        if (a) {
            a.click();
            setTimeout(function () {
                let obj = document.querySelector(`input#${element}Origin`);
                obj?.focus();
                obj?.select();
            }, 0);
        }
        throw new Error(`Number format error for element tab {element: '${element}', name: '${name}', i: ${i}}`);
    }
    return +value;
}

function saveLog(equations) {
    let log = get('Log');
    if (!log) {
        log = [];
    } else {
        log = JSON.parse(log);
    }
    let list = ELEMENTS.split(';').map(o => o.split(',')[0]);
    let obj = {
        origins: ORIGINS,
        elements: list.reduce((a, b) => {
            a[b] = +document.querySelector(`input[name=${b}Element]`)?.value || 0;
            return a;
        }, {}),
        percents: list.reduce((a, b) => {
            a[b] = +document.querySelector(`input[name=${b}Percent]`)?.value || 0;
            return a;
        }, {}),
        type: document.querySelector('#calculateType').value,
        equations: equations.join(';'),
    };
    let now = new Date().getTime();
    log = log.filter(o => o[0] >= now - LOG_DAYS);
    log.push([now, JSON.stringify(obj)]);
    log = log.sort((a, b) => a[0] - b[0]);
    set('Log', JSON.stringify(log));
}

function showLog() {
    if (!confirm('将导出近期计算历史记录到Excel文件，是否导出？')) {
        return;
    }
    let log = get('Log');
    if (!log) {
        log = [];
    } else {
        log = JSON.parse(log);
    }
    log.map(o => (o[0] = new Date(o[0])) && o);
    log = log.filter(o => o[1].indexOf('equations') > -1);
    log = log.map(o => {
        let data = JSON.parse(o[1]);
        let result = {};
        result['时间'] = o[0];
        result['原材料设置'] = JSON.stringify(data.origins);
        result['成品设置'] = JSON.stringify(data.elements);
        result['锡包合金设置'] = JSON.stringify(data.percents);
        result['计算方法'] = data.type;
        result['方程式'] = data.equations;
        return result;
    });
    let workSheet = XLSX.utils.json_to_sheet(log);
    workSheet["!cols"] = [{wch: 20}, {wch: 30}, {wch: 30}, {wch: 30}, {wch: 20}, {wch: 30}];
    let workBook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workBook, workSheet, "Sheet1");
    for (let k in workBook.Sheets.Sheet1) {
        if (/A[0-9]+/.test(k) && +k.match(/\d+/) > 1) {
            workBook.Sheets.Sheet1[k].z = 'yyyy-mm-dd hh:mm:ss';
        }
    }
    let now = moment().format('YYYY-MM-DD HH:mm:ss');
    XLSX.writeFile(workBook, '合金成分计算器日志' + now + '.xlsx');
}