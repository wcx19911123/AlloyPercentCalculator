"use strict";
const PREFIX = '__AlloyPercentCalculator_';
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
DEFAULT_PERCENTS.unshift({c: "", n: "请录入占比后点保存规格", v: null})
const NUMBER_REG = /^\d+(\.\d+)?$/;
const UNKNOWS = 'xyzuvw';
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
    ['目前只支持锡原料和其他合金半成品（如铜合金、银合金）的配比计算；暂不支持半成品、成品（如上次多余的成品）和其他合金半成品的配比计算。',],
    ['操作流程：', [
        ['填锡锭<r>原材料</r>重量；',],
        ['矩形框里填<r>成品</r>的元素占比；填好之后可以点 <b>保存规格</b>，取个名字点确定，之后可以在 <b>成品规格</b> 里选名字自动带出元素占比；',],
        ['下面填各个锡包合金（<r>半成品</r>）的元素占比，填锡以外的元素的占比；',],
        ['点 <b>计算配比</b>，会在弹出的页面显示各个锡包合金需要加多少重量；弹出页面从左到右的数字，对应这个页面从上到下的元素。',],
    ]],
    ['每次填好的数字，下次打开页面会自动带出，不需要重新填写。'],
    ['也可以填写<r>数字计算表达式</r>（支持 <b>+ - * / ( )</b> 这些符号），然后按回车键，会自动计算结果。'],
    ['<b>计算配比</b> 右边可以选择不同的页面计算（如果某个页面打不开请试下其他的）'],
];
var SECTIONS;

function set(k, v) {
    localStorage.setItem(PREFIX + k, v);
}

function get(k) {
    return localStorage.getItem(PREFIX + k);
}

function saveInput(obj) {
    calculateInput(obj);
    set(obj.id || obj.name, obj.value);
}

function initInput() {
    ELEMENTS.split(';').reverse().forEach(o => {
        let [code, name] = o.split(',');
        document.querySelector('tr#alloyTr').outerHTML +=
            `<tr>
                <td>${name}合金占比：</td>
                <td>
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
        element.value = +(+v).toFixed(6);
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
    } else {
        todo = [...inputs, ...selects];
    }
    todo.forEach(o => o.value = get(o.id || o.name) || '');
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

function init() {
    initInput();
    initSections();
    initValue();
    initDescription();
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
    // result.Other = +document.querySelector('input[name=OtherElement]').value;
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
        let Sn = checkNumber('input[name=SnElement]', '锡锭原材料');
        let elements = ELEMENTS.split(';');
        let alloys = JSON.parse(JSON.stringify(elements));
        let codes = elements.map(o => o.split(',')[0]);
        let names = elements.map(o => o.split(',')[1]);
        for (let i = 0; i < codes.length; i++) {
            elements[i] = checkNumber(`input[name=${codes[i]}Element]`, `${names[i]}元素占比`);
            elements[i] = +(elements[i] / 100).toFixed(6);
            alloys[i] = checkNumber(`input[name=${codes[i]}Percent]`, `${names[i]}合金占比`);
            alloys[i] = +(alloys[i] / 100).toFixed(6);
        }
        let equationSet = [], usedElements = [];
        for (let i = 0; i < codes.length; i++) {
            if (elements[i] <= 0) {
                continue;
            }
            usedElements.push(UNKNOWS[i]);
            equationSet.push(`(${Sn}\${usedElements})*\
${elements[i]}=\
${alloys[i]}*\
${UNKNOWS[i]}`);
        }
        let list = equationSet.map(o => o.replace('${usedElements}', usedElements.map(m => `+${m}`).join('')));
        let type = document.querySelector('select#calculateType')?.value || 'NUMBER_EMPIRE';
        let url = URL_CONFIG[type].toUrlParams(list, usedElements);
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