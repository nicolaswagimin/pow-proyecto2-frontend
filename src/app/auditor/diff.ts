// Diff por líneas (antes/después del HTML). Primero se recortan el comienzo y el final iguales y
// solo el medio se compara con LCS: las correcciones son pequeñas, así que eso queda chico aunque
// el documento sea grande.

export interface LineaDiff {
  tipo: 'igual' | 'quitada' | 'agregada';
  texto: string;
  numA?: number;
  numB?: number;
}

const MAX_CELDAS = 4_000_000; // tope de la tabla LCS: más allá, el medio se marca entero como cambio

export function diffLineas(antes: string, despues: string): LineaDiff[] {
  const a = antes.split('\n');
  const b = despues.split('\n');
  let inicio = 0;
  while (inicio < a.length && inicio < b.length && a[inicio] === b[inicio]) inicio++;
  let finA = a.length;
  let finB = b.length;
  while (finA > inicio && finB > inicio && a[finA - 1] === b[finB - 1]) {
    finA--;
    finB--;
  }

  const salida: LineaDiff[] = [];
  for (let i = 0; i < inicio; i++)
    salida.push({ tipo: 'igual', texto: a[i], numA: i + 1, numB: i + 1 });
  salida.push(...medio(a.slice(inicio, finA), b.slice(inicio, finB), inicio));
  for (let i = 0; i < a.length - finA; i++) {
    salida.push({ tipo: 'igual', texto: a[finA + i], numA: finA + i + 1, numB: finB + i + 1 });
  }
  return salida;
}

function medio(a: string[], b: string[], desplazamiento: number): LineaDiff[] {
  const n = a.length;
  const m = b.length;
  if (n * m > MAX_CELDAS) {
    return [
      ...a.map((texto, i) => ({ tipo: 'quitada' as const, texto, numA: desplazamiento + i + 1 })),
      ...b.map((texto, j) => ({ tipo: 'agregada' as const, texto, numB: desplazamiento + j + 1 })),
    ];
  }
  // lcs[i][j] = largo de la subsecuencia común más larga de a[i..] y b[j..]
  const lcs = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      lcs[i][j] = a[i] === b[j] ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }
  const salida: LineaDiff[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      salida.push({
        tipo: 'igual',
        texto: a[i],
        numA: desplazamiento + i + 1,
        numB: desplazamiento + j + 1,
      });
      i++;
      j++;
    } else if (j < m && (i === n || lcs[i][j + 1] > lcs[i + 1][j])) {
      salida.push({ tipo: 'agregada', texto: b[j], numB: desplazamiento + j + 1 });
      j++;
    } else {
      salida.push({ tipo: 'quitada', texto: a[i], numA: desplazamiento + i + 1 });
      i++;
    }
  }
  return salida;
}
