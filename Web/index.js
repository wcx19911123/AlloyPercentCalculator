"use strict";
const PREFIX = '__AlloyPercentCalculator_';
const ELEMENTS = 'Cu,铜;Ag,银;Ni,镍;Ge,锗';
const NUMBER_REG = /^\d+(\.\d+)?$/;
const UNKNOWS = 'xyzuvw';
const URL = `https://zh.numberempire.com/equationsolver.php`;
var SECTIONS;

function set(k, v) {
    localStorage.setItem(PREFIX + k, v);
}

function get(k) {
    return localStorage.getItem(PREFIX + k);
}

function saveInput(obj) {
    set(obj.id || obj.name, obj.value);
}

function initInput() {
    ELEMENTS.split(';').reverse().forEach(o => {
        let [code, name] = o.split(',');
        document.querySelector('tr#alloyTr').outerHTML +=
            `<tr>
                <td>${name}合金占比：</td>
                <td>
                    <input name="${code}Percent" onblur="saveInput(this)" type="number"/> %
                </td>
            </tr>`;
        document.querySelector('tr#elementTr').outerHTML +=
            `<tr>
                <td>${name}元素占比：</td>
                <td>
                    <input name="${code}Element" onblur="saveInput(this)" type="number"/> %
                </td>
            </tr>`;
    });
}

function initSections() {
    SECTIONS = get('sections')
    if (!SECTIONS) {
        SECTIONS = [{c: '', n: '请选择', v: null}];
        set('sections', JSON.stringify(SECTIONS));
    } else {
        SECTIONS = JSON.parse(SECTIONS);
    }
    document.querySelector('select#selectAlloy').innerHTML =
        SECTIONS.reduce((a, b) => a += `<option value="${b.c}">${b.n}</option>`, '');
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

function init() {
    initInput();
    initSections();
    initValue();
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
    let idx = SECTIONS.findIndex(o => o.n === name);
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
    result.Other = +document.querySelector('input[name=OtherElement]').value;
    return result;
}

function deleteAlloy() {
    let name = document.querySelector('select#selectAlloy')?.value;
    if (!name) {
        alert('请先选择一个成品规格再进行删除！');
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
        console.log(Sn, elements, alloys);
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
        let result = equationSet
            .map((o, i) => o.replace('${usedElements}', usedElements.map(m => `+${m}`).join('')))
            .join(',');
        // document.querySelector('iframe#iframe').src = `${URL}?function=${encodeURIComponent(result)}&var=${usedElements.join(',')}&result_type=true`;
        window.open(`${URL}?function=${encodeURIComponent(result)}&var=${usedElements.join(',')}&result_type=true`);
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