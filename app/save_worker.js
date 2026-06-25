// Hintergrund-Komprimierung des großen Archiv-Saves (history+archive) via Web Worker → kein UI-Freeze
// beim Saisonwechsel. Der Worker führt EXAKT den lz-string compressToUTF16-Algorithmus aus (eigenständige
// Kopie, public domain) → Ausgabe bit-identisch zu LZString.compressToUTF16 (per Round-Trip verifiziert),
// damit LZString.decompressFromUTF16 beim Laden weiterhin funktioniert. localStorage gibt es im Worker
// nicht → Worker liefert nur den komprimierten String zurück, der Hauptthread schreibt ihn.

// Eigenständige, exakt lz-string-kompatible compressToUTF16-Implementierung (wird in den Worker serialisiert).
function _baLzCompressUTF16(input) {
    if (input == null) return "";
    var bitsPerChar = 15, getCharFromInt = function (a) { return String.fromCharCode(a + 32); };
    var value, context_dictionary = {}, context_dictionaryToCreate = {}, context_c = "",
        context_wc = "", context_w = "", context_enlargeIn = 2, context_dictSize = 3,
        context_numBits = 2, context_data = [], context_data_val = 0, context_data_position = 0, ii, i;
    for (ii = 0; ii < input.length; ii += 1) {
        context_c = input.charAt(ii);
        if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
            context_dictionary[context_c] = context_dictSize++;
            context_dictionaryToCreate[context_c] = true;
        }
        context_wc = context_w + context_c;
        if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
            context_w = context_wc;
        } else {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = value >> 1;
                    }
                } else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | value;
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = 0;
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
                delete context_dictionaryToCreate[context_w];
            } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
            context_dictionary[context_wc] = context_dictSize++;
            context_w = String(context_c);
        }
    }
    if (context_w !== "") {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
            if (context_w.charCodeAt(0) < 256) {
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1);
                    if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 8; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                    value = value >> 1;
                }
            } else {
                value = 1;
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | value;
                    if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                    value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 16; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
            delete context_dictionaryToCreate[context_w];
        } else {
            value = context_dictionary[context_w];
            for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
                value = value >> 1;
            }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) { context_enlargeIn = Math.pow(2, context_numBits); context_numBits++; }
    }
    value = 2;
    for (i = 0; i < context_numBits; i++) {
        context_data_val = (context_data_val << 1) | (value & 1);
        if (context_data_position == bitsPerChar - 1) { context_data_position = 0; context_data.push(getCharFromInt(context_data_val)); context_data_val = 0; } else { context_data_position++; }
        value = value >> 1;
    }
    while (true) {
        context_data_val = (context_data_val << 1);
        if (context_data_position == bitsPerChar - 1) { context_data.push(getCharFromInt(context_data_val)); break; } else context_data_position++;
    }
    return context_data.join('') + " ";
}

Object.assign(Engine, {
    _compressWorker: null,
    _compressWorkerBroken: false,

    // Lazy: Worker aus Blob bauen (Funktion via toString in den Worker serialisiert)
    _getCompressWorker: function () {
        if (this._compressWorkerBroken) return null;
        if (this._compressWorker) return this._compressWorker;
        if (typeof Worker === 'undefined' || typeof URL === 'undefined' || !URL.createObjectURL) { this._compressWorkerBroken = true; return null; }
        try {
            const src = 'var f=' + _baLzCompressUTF16.toString() + ';self.onmessage=function(e){try{postMessage({id:e.data.id,lz:f(e.data.s)});}catch(err){postMessage({id:e.data.id,err:String(err)});}};';
            const w = new Worker(URL.createObjectURL(new Blob([src], { type: 'application/javascript' })));
            this._compressWorker = w;
            return w;
        } catch (e) { this._compressWorkerBroken = true; return null; }
    },

    // Promise<'LZ1'+komprimiert>. Off-thread; Fallback (kein Worker) → synchron via _encodeSave.
    _compressAsync: function (jsonStr) {
        const w = this._getCompressWorker();
        if (!w) return Promise.resolve(this._encodeSave(jsonStr));
        return new Promise((resolve) => {
            if (this._compressReqId == null) this._compressReqId = 0;
            const id = ++this._compressReqId;
            const onMsg = (e) => {
                if (!e.data || e.data.id !== id) return;
                w.removeEventListener('message', onMsg);
                if (e.data.err || e.data.lz == null) { this._compressWorkerBroken = true; resolve(this._encodeSave(jsonStr)); }
                else resolve('LZ1' + e.data.lz);
            };
            w.addEventListener('message', onMsg);
            w.onerror = () => { this._compressWorkerBroken = true; try { w.removeEventListener('message', onMsg); } catch (_) {} resolve(this._encodeSave(jsonStr)); };
            w.postMessage({ id, s: jsonStr });
        });
    }
});
