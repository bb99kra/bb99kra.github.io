/**
 * CLAUDE AI - CLIENT-SIDE JAVA DISASSEMBLER & DECOMPILER
 * Parses Java .class binary bytecode directly in the browser via DataView,
 * extracts package, class hierarchy, fields, methods, string constants,
 * and generates readable decompiled Java source code.
 */

export class JavaClassDisassembler {
  static parse(arrayBuffer) {
    try {
      const view = new DataView(arrayBuffer);
      let offset = 0;

      // 1. Magic number 0xCAFEBABE
      if (view.byteLength < 10) return null;
      const magic = view.getUint32(offset);
      if (magic !== 0xCAFEBABE) return null;
      offset += 4;

      const minor = view.getUint16(offset); offset += 2;
      const major = view.getUint16(offset); offset += 2;

      // 2. Constant Pool
      const cpCount = view.getUint16(offset); offset += 2;
      const cp = [null]; // 1-indexed

      for (let i = 1; i < cpCount; i++) {
        if (offset >= view.byteLength) break;
        const tag = view.getUint8(offset); offset += 1;

        if (tag === 1) { // CONSTANT_Utf8
          const len = view.getUint16(offset); offset += 2;
          const bytes = new Uint8Array(arrayBuffer, offset, len);
          const str = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
          offset += len;
          cp[i] = { tag: 1, value: str };
        } else if (tag === 7) { // CONSTANT_Class
          const nameIdx = view.getUint16(offset); offset += 2;
          cp[i] = { tag: 7, nameIndex: nameIdx };
        } else if (tag === 8) { // CONSTANT_String
          const strIdx = view.getUint16(offset); offset += 2;
          cp[i] = { tag: 8, stringIndex: strIdx };
        } else if (tag === 9 || tag === 10 || tag === 11) { // Fieldref, Methodref, InterfaceMethodref
          const classIdx = view.getUint16(offset); offset += 2;
          const ntIdx = view.getUint16(offset); offset += 2;
          cp[i] = { tag, classIndex: classIdx, nameAndTypeIndex: ntIdx };
        } else if (tag === 12) { // CONSTANT_NameAndType
          const nameIdx = view.getUint16(offset); offset += 2;
          const descIdx = view.getUint16(offset); offset += 2;
          cp[i] = { tag: 12, nameIndex: nameIdx, descriptorIndex: descIdx };
        } else if (tag === 3 || tag === 4) { // Integer, Float
          offset += 4;
          cp[i] = { tag };
        } else if (tag === 5 || tag === 6) { // Long, Double (takes 2 slots)
          offset += 8;
          cp[i] = { tag };
          i++; // Skip next slot as per JVM spec
        } else if (tag === 15) { // MethodHandle
          offset += 3;
          cp[i] = { tag };
        } else if (tag === 16 || tag === 19 || tag === 20) { // MethodType, Module, Package
          offset += 2;
          cp[i] = { tag };
        } else if (tag === 17 || tag === 18) { // Dynamic, InvokeDynamic
          offset += 4;
          cp[i] = { tag };
        } else {
          break;
        }
      }

      const getUtf8 = (idx) => {
        const entry = cp[idx];
        return (entry && entry.tag === 1) ? entry.value : '';
      };

      const getClassName = (idx) => {
        const entry = cp[idx];
        if (entry && entry.tag === 7) return getUtf8(entry.nameIndex);
        return '';
      };

      if (offset + 6 > view.byteLength) return null;

      // 3. Access Flags, This Class, Super Class
      const accessFlags = view.getUint16(offset); offset += 2;
      const thisClass = getClassName(view.getUint16(offset)); offset += 2;
      const superClass = getClassName(view.getUint16(offset)); offset += 2;

      // 4. Interfaces
      const ifaceCount = view.getUint16(offset); offset += 2;
      const interfaces = [];
      for (let i = 0; i < ifaceCount && offset + 2 <= view.byteLength; i++) {
        interfaces.push(getClassName(view.getUint16(offset)));
        offset += 2;
      }

      // 5. Fields
      const fieldCount = view.getUint16(offset); offset += 2;
      const fields = [];
      for (let i = 0; i < fieldCount && offset + 8 <= view.byteLength; i++) {
        const fFlags = view.getUint16(offset); offset += 2;
        const fName = getUtf8(view.getUint16(offset)); offset += 2;
        const fDesc = getUtf8(view.getUint16(offset)); offset += 2;
        const fAttrCount = view.getUint16(offset); offset += 2;
        for (let a = 0; a < fAttrCount && offset + 6 <= view.byteLength; a++) {
          offset += 2; // attr name
          const aLen = view.getUint32(offset); offset += 4;
          offset += aLen;
        }
        fields.push({ flags: fFlags, name: fName, descriptor: fDesc });
      }

      // 6. Methods & Bytecode Disassembly
      const methodCount = view.getUint16(offset); offset += 2;
      const methods = [];
      for (let i = 0; i < methodCount && offset + 8 <= view.byteLength; i++) {
        const mFlags = view.getUint16(offset); offset += 2;
        const mName = getUtf8(view.getUint16(offset)); offset += 2;
        const mDesc = getUtf8(view.getUint16(offset)); offset += 2;
        const mAttrCount = view.getUint16(offset); offset += 2;
        let methodCodeOps = [];

        for (let a = 0; a < mAttrCount && offset + 6 <= view.byteLength; a++) {
          const attrNameIdx = view.getUint16(offset); offset += 2;
          const aLen = view.getUint32(offset); offset += 4;
          const attrName = getUtf8(attrNameIdx);

          if (attrName === 'Code' && aLen >= 8 && offset + aLen <= view.byteLength) {
            const maxStack = view.getUint16(offset);
            const maxLocals = view.getUint16(offset + 2);
            const codeLen = view.getUint32(offset + 4);
            const codeOffset = offset + 8;
            
            // Disassemble bytecode instructions into readable traces
            let cIdx = 0;
            while (cIdx < codeLen && codeOffset + cIdx < view.byteLength) {
              const op = view.getUint8(codeOffset + cIdx);
              if (op === 0xb2 || op === 0xb3) { // getstatic / putstatic
                const fIdx = view.getUint16(codeOffset + cIdx + 1);
                const fieldRef = cp[fIdx];
                const cName = fieldRef ? getClassName(fieldRef.classIndex).split('/').pop() : '';
                const nt = fieldRef ? cp[fieldRef.nameAndTypeIndex] : null;
                const fName = nt ? getUtf8(nt.nameIndex) : '';
                methodCodeOps.push(`${cName}.${fName};`);
                cIdx += 3;
              } else if (op === 0xb4 || op === 0xb5) { // getfield / putfield
                const fIdx = view.getUint16(codeOffset + cIdx + 1);
                const fieldRef = cp[fIdx];
                const nt = fieldRef ? cp[fieldRef.nameAndTypeIndex] : null;
                const fName = nt ? getUtf8(nt.nameIndex) : '';
                methodCodeOps.push(op === 0xb4 ? `this.${fName};` : `this.${fName} = arg0;`);
                cIdx += 3;
              } else if (op === 0xb6 || op === 0xb7 || op === 0xb8 || op === 0xb9) { // invokevirtual / invokespecial / invokestatic / invokeinterface
                const mRefIdx = view.getUint16(codeOffset + cIdx + 1);
                const mRef = cp[mRefIdx];
                const cName = mRef ? getClassName(mRef.classIndex).split('/').pop() : '';
                const nt = mRef ? cp[mRef.nameAndTypeIndex] : null;
                const mMethodName = nt ? getUtf8(nt.nameIndex) : '';
                if (mMethodName && mMethodName !== '<init>') {
                  methodCodeOps.push(`${cName ? cName + '.' : ''}${mMethodName}();`);
                }
                cIdx += (op === 0xb9 ? 5 : 3);
              } else if (op === 0x12) { // ldc
                const strConstIdx = view.getUint8(codeOffset + cIdx + 1);
                const entry = cp[strConstIdx];
                if (entry && entry.tag === 8) {
                  const s = getUtf8(entry.stringIndex);
                  if (s) methodCodeOps.push(`"${s.replace(/"/g, '\\"')}"`);
                }
                cIdx += 2;
              } else if (op === 0x13 || op === 0x14) { // ldc_w / ldc2_w
                const strConstIdx = view.getUint16(codeOffset + cIdx + 1);
                const entry = cp[strConstIdx];
                if (entry && entry.tag === 8) {
                  const s = getUtf8(entry.stringIndex);
                  if (s) methodCodeOps.push(`"${s.replace(/"/g, '\\"')}"`);
                }
                cIdx += 3;
              } else if (op === 0xac || op === 0xb0) { // ireturn / areturn
                methodCodeOps.push(`return`);
                cIdx += 1;
              } else if (op === 0xb1) { // return void
                methodCodeOps.push(`return`);
                cIdx += 1;
              } else {
                cIdx += 1;
              }
            }
          }
          offset += aLen;
        }
        methods.push({ flags: mFlags, name: mName, descriptor: mDesc, opCodes: methodCodeOps });
      }

      // 7. String Constants in Constant Pool
      const referencedStrings = new Set();
      for (let i = 1; i < cp.length; i++) {
        if (cp[i] && cp[i].tag === 8) {
          const s = getUtf8(cp[i].stringIndex);
          if (s && s.trim().length > 0 && s.length < 400) {
            referencedStrings.add(s.trim());
          }
        }
      }

      return {
        className: thisClass,
        superClass,
        interfaces,
        fields,
        methods,
        strings: Array.from(referencedStrings)
      };
    } catch (e) {
      console.warn('Class parse error:', e);
      return null;
    }
  }

  static toJavaSource(parsed) {
    if (!parsed || !parsed.className) return '// [Không thể dịch ngược bytecode của class này]';
    const parts = [];
    const classNameParts = parsed.className.split('/');
    const simpleName = classNameParts.pop();
    const packageName = classNameParts.join('.');

    if (packageName) {
      parts.push(`package ${packageName};\n`);
    }

    const ifaces = parsed.interfaces.length > 0 
      ? ` implements ${parsed.interfaces.map(i => i.split('/').pop()).join(', ')}` 
      : '';
    const ext = (parsed.superClass && parsed.superClass !== 'java/lang/Object')
      ? ` extends ${parsed.superClass.split('/').pop()}` 
      : '';

    parts.push(`public class ${simpleName}${ext}${ifaces} {`);

    // Fields
    if (parsed.fields.length > 0) {
      parts.push('    // --- Fields ---');
      parsed.fields.forEach(f => {
        const type = this.formatDescriptor(f.descriptor);
        parts.push(`    private ${type} ${f.name};`);
      });
      parts.push('');
    }

    // Methods
    if (parsed.methods.length > 0) {
      parts.push('    // --- Decompiled Methods & Handlers ---');
      parsed.methods.forEach(m => {
        if (m.name === '<init>') {
          parts.push(`    public ${simpleName}() {\n        super();\n    }`);
        } else if (m.name === '<clinit>') {
          parts.push(`    static {\n        // Static initializer\n    }`);
        } else {
          const sig = this.formatMethodSignature(m.name, m.descriptor);
          const match = m.descriptor ? m.descriptor.match(/^\(.*?\)(.*)$/) : null;
          const retType = match ? this.formatDescriptor(match[1]) : 'void';
          const retStatement = this.getReturnDefault(retType);

          let methodLines = [];
          if (m.opCodes && m.opCodes.length > 0) {
            m.opCodes.slice(0, 15).forEach(op => {
              if (!op.startsWith('"') && !op.startsWith('return')) {
                methodLines.push(`        ${op}`);
              }
            });
          }
          if (retStatement) {
            methodLines.push(`        ${retStatement}`);
          }
          parts.push(`    ${sig} {\n${methodLines.join('\n')}\n    }`);
        }
      });
      parts.push('');
    }

    // Extracted String Constants (Commands, Permissions, SQL, Messages)
    if (parsed.strings.length > 0) {
      parts.push('    // --- Strings, Commands & Permissions Found in Bytecode ---');
      parsed.strings.slice(0, 40).forEach(str => {
        const escaped = str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
        parts.push(`    // Constant: "${escaped}"`);
      });
    }

    parts.push('}');
    return parts.join('\n');
  }

  static getReturnDefault(retType) {
    if (!retType || retType === 'void') return '';
    if (retType === 'boolean') return 'return true;';
    if (retType === 'int' || retType === 'short' || retType === 'byte') return 'return 0;';
    if (retType === 'long') return 'return 0L;';
    if (retType === 'float') return 'return 0.0f;';
    if (retType === 'double') return 'return 0.0;';
    if (retType === 'char') return "return ' ';";
    if (retType === 'String') return 'return "";';
    if (retType.endsWith('[]')) return 'return new ' + retType + '{};';
    if (retType === 'List') return 'return new java.util.ArrayList<>();';
    if (retType === 'Map') return 'return new java.util.HashMap<>();';
    if (retType === 'Set') return 'return new java.util.HashSet<>();';
    return 'return null;';
  }

  static formatDescriptor(desc) {
    if (!desc) return 'void';
    if (desc.startsWith('L') && desc.endsWith(';')) return desc.slice(1, -1).split('/').pop();
    if (desc === 'I') return 'int';
    if (desc === 'Z') return 'boolean';
    if (desc === 'J') return 'long';
    if (desc === 'D') return 'double';
    if (desc === 'F') return 'float';
    if (desc === 'B') return 'byte';
    if (desc === 'C') return 'char';
    if (desc === 'S') return 'short';
    if (desc === 'V') return 'void';
    if (desc.startsWith('[')) return this.formatDescriptor(desc.slice(1)) + '[]';
    return desc;
  }

  static formatMethodSignature(name, desc) {
    const match = desc.match(/^\((.*?)\)(.*)$/);
    if (!match) return `public void ${name}()`;
    const retType = this.formatDescriptor(match[2]);
    const rawParams = match[1];

    const paramTypes = [];
    let pOffset = 0;
    while (pOffset < rawParams.length) {
      let ch = rawParams[pOffset];
      let arrayPrefix = '';
      while (ch === '[') {
        arrayPrefix += '[]';
        pOffset++;
        ch = rawParams[pOffset];
      }
      if (ch === 'L') {
        const semi = rawParams.indexOf(';', pOffset);
        if (semi !== -1) {
          const typeName = rawParams.slice(pOffset + 1, semi).split('/').pop();
          paramTypes.push(typeName + arrayPrefix);
          pOffset = semi + 1;
        } else {
          break;
        }
      } else {
        const primitive = this.formatDescriptor(ch);
        paramTypes.push(primitive + arrayPrefix);
        pOffset++;
      }
    }

    const paramList = paramTypes.map((t, idx) => `${t} arg${idx}`).join(', ');
    return `public ${retType} ${name}(${paramList})`;
  }
}
