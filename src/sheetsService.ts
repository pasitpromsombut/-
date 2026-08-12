import { Product, Transaction, UserRoleMapping, ShippingStatus } from './types';

const SPREADSHEET_NAME = 'Stock Management App (ระบบจัดการสต๊อกสินค้า)';

export async function getOrCreateSpreadsheet(accessToken: string): Promise<string> {
  // 1. Search for existing spreadsheet
  const query = encodeURIComponent(`name='${SPREADSHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!searchRes.ok) {
    throw new Error(`Failed to search Drive: ${searchRes.statusText}`);
  }
  
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }
  
  // 2. Spreadsheet not found, create a new one
  const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
  const spreadsheetBody = {
    properties: {
      title: SPREADSHEET_NAME,
    },
    sheets: [
      {
        properties: {
          title: 'สินค้า',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'ประวัติรายการ',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
      {
        properties: {
          title: 'สิทธิ์การเข้าใช้งาน',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
      },
    ],
  };
  
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(spreadsheetBody),
  });
  
  if (!createRes.ok) {
    throw new Error(`Failed to create spreadsheet: ${createRes.statusText}`);
  }
  
  const newSheet = await createRes.json();
  const spreadsheetId = newSheet.spreadsheetId;
  
  // 3. Initialize headers & sample data
  const initUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`;
  
  const sampleProducts = [
    ['PROD001', 'กล่องกระดาษลูกฟูก A', 'บรรจุภัณฑ์', '15', '50', '12.00', 'ใบ', '2026-07-19 08:00:00', 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&w=400&q=80'],
    ['PROD002', 'ปากกาลูกลื่นสีน้ำเงิน', 'เครื่องเขียน', '120', '20', '5.00', 'ด้าม', '2026-07-19 08:00:00', 'https://images.unsplash.com/photo-1585336261026-875a60a1c92f?auto=format&fit=crop&w=400&q=80'],
    ['PROD003', 'เทปกาวปิดกล่อง 2 นิ้ว', 'อุปกรณ์แพ็คกิ้ง', '8', '10', '35.00', 'ม้วน', '2026-07-19 08:00:00', 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=400&q=80'],
    ['PROD004', 'ถุงพลาสติกกันกระแทก 10x15cm', 'บรรจุภัณฑ์', '300', '100', '1.50', 'ซอง', '2026-07-19 08:00:00', 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=400&q=80'],
    ['PROD005', 'กระดาษ A4 80 แกรม', 'เครื่องเขียน', '4', '5', '135.00', 'รีม', '2026-07-19 08:00:00', 'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?auto=format&fit=crop&w=400&q=80'],
  ];
  
  const sampleTransactions = [
    ['TX-100001', '2026-07-18 10:30:00', 'รับเข้า', 'PROD001', 'กล่องกระดาษลูกฟูก A', '50', 'admin@example.com', 'ยกล็อตนำเข้าตั้งต้น'],
    ['TX-100002', '2026-07-18 14:15:00', 'เบิกออก', 'PROD001', 'กล่องกระดาษลูกฟูก A', '35', 'admin@example.com', 'เบิกใช้งานแพ็คสินค้า'],
    ['TX-100003', '2026-07-19 09:00:00', 'รับเข้า', 'PROD003', 'เทปกาวปิดกล่อง 2 นิ้ว', '10', 'admin@example.com', 'ซื้อเพิ่มจากร้านค้าส่ง'],
  ];
  
  const initBody = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'สินค้า'!A1:I1",
        values: [['รหัสสินค้า', 'ชื่อสินค้า', 'หมวดหมู่', 'จำนวนคงเหลือ', 'ขั้นต่ำเตือนสินค้าใกล้หมด', 'ราคาต่อหน่วย', 'หน่วยนับ', 'อัปเดตล่าสุด', 'รูปภาพสินค้า']],
      },
      {
        range: "'สินค้า'!A2:I6",
        values: sampleProducts,
      },
      {
        range: "'ประวัติรายการ'!A1:H1",
        values: [['รหัสรายการ', 'วัน-เวลา', 'ประเภท', 'รหัสสินค้า', 'ชื่อสินค้า', 'จำนวน', 'ผู้ทำรายการ', 'หมายเหตุ']],
      },
      {
        range: "'ประวัติรายการ'!A2:H4",
        values: sampleTransactions,
      },
      {
        range: "'สิทธิ์การเข้าใช้งาน'!A1:E1",
        values: [['อีเมล', 'ชื่อ', 'บทบาท', 'สถานี/หน่วยงาน', 'อัปเดตล่าสุด']],
      },
    ],
  };
  
  const initRes = await fetch(initUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(initBody),
  });
  
  if (!initRes.ok) {
    console.error('Failed to write headers/samples to sheet:', initRes.statusText);
  }
  
  return spreadsheetId;
}

export async function fetchProducts(spreadsheetId: string, accessToken: string): Promise<Product[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สินค้า'!A2:I1000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch products: ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.values) return [];
  
  return data.values.map((row: string[]) => ({
    id: row[0] || '',
    name: row[1] || '',
    category: row[2] || '',
    quantity: parseFloat(row[3]) || 0,
    minStock: parseFloat(row[4]) || 0,
    price: parseFloat(row[5]) || 0,
    unit: row[6] || '',
    updatedAt: row[7] || '',
    imageUrl: row[8] || '',
  }));
}

export async function fetchTransactions(spreadsheetId: string, accessToken: string): Promise<Transaction[]> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติรายการ'!A2:I5000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch transactions: ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.values) return [];
  
  return data.values.map((row: string[]) => {
    const type = row[2] as 'รับเข้า' | 'เบิกออก';
    let status = row[8] as ShippingStatus | undefined;
    if (!status) {
      status = type === 'เบิกออก' ? 'กำลังเตรียมจัดส่ง' : 'จัดส่งสำเร็จ';
    }
    return {
      id: row[0] || '',
      timestamp: row[1] || '',
      type,
      productId: row[3] || '',
      productName: row[4] || '',
      quantity: parseFloat(row[5]) || 0,
      userEmail: row[6] || '',
      note: row[7] || '',
      shippingStatus: status,
    };
  }).reverse(); // Reverse to put newest transaction first in UX
}

export async function addProduct(
  spreadsheetId: string,
  accessToken: string,
  product: Product
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สินค้า'!A:I:append?valueInputOption=USER_ENTERED`;
  
  const row = [
    product.id,
    product.name,
    product.category,
    product.quantity.toString(),
    product.minStock.toString(),
    product.price.toString(),
    product.unit,
    product.updatedAt,
    product.imageUrl || '',
  ];
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: "'สินค้า'!A:I",
      majorDimension: 'ROWS',
      values: [row],
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to add product: ${res.statusText}`);
  }
}

export async function updateProductRow(
  spreadsheetId: string,
  accessToken: string,
  product: Product,
  rowIndex: number // 0-based index of product list (row 2 is index 0)
): Promise<void> {
  const rowNumber = rowIndex + 2;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สินค้า'!A${rowNumber}:I${rowNumber}?valueInputOption=USER_ENTERED`;
  
  const row = [
    product.id,
    product.name,
    product.category,
    product.quantity.toString(),
    product.minStock.toString(),
    product.price.toString(),
    product.unit,
    product.updatedAt,
    product.imageUrl || '',
  ];
  
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `'สินค้า'!A${rowNumber}:I${rowNumber}`,
      majorDimension: 'ROWS',
      values: [row],
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to update product at row ${rowNumber}: ${res.statusText}`);
  }
}

export async function addTransaction(
  spreadsheetId: string,
  accessToken: string,
  transaction: Transaction
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติรายการ'!A:I:append?valueInputOption=USER_ENTERED`;
  
  const status = transaction.shippingStatus || (transaction.type === 'เบิกออก' ? 'อยู่ระหว่างจัดส่ง' : 'จัดส่งสำเร็จ');

  const row = [
    transaction.id,
    transaction.timestamp,
    transaction.type,
    transaction.productId,
    transaction.productName,
    transaction.quantity.toString(),
    transaction.userEmail,
    transaction.note,
    status,
  ];
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: "'ประวัติรายการ'!A:I",
      majorDimension: 'ROWS',
      values: [row],
    }),
  });
  
  if (!res.ok) {
    throw new Error(`Failed to add transaction record: ${res.statusText}`);
  }
}

export async function updateTransactionShippingStatus(
  spreadsheetId: string,
  accessToken: string,
  transactionId: string,
  newStatus: ShippingStatus
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติรายการ'!A2:A5000`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!res.ok) {
    throw new Error(`Failed to fetch transactions list for status update: ${res.statusText}`);
  }
  
  const data = await res.json();
  if (!data.values) throw new Error('Transaction record not found');
  
  const rowIndex = data.values.findIndex((row: string[]) => row[0] === transactionId);
  if (rowIndex === -1) {
    throw new Error(`Transaction ${transactionId} not found in sheet`);
  }
  
  const rowNumber = rowIndex + 2;
  
  const updateUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'ประวัติรายการ'!I${rowNumber}?valueInputOption=USER_ENTERED`;
  const updateRes = await fetch(updateUrl, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      range: `'ประวัติรายการ'!I${rowNumber}`,
      majorDimension: 'ROWS',
      values: [[newStatus]],
    }),
  });
  
  if (!updateRes.ok) {
    throw new Error(`Failed to update shipping status: ${updateRes.statusText}`);
  }
}

export async function deleteProductRow(
  spreadsheetId: string,
  accessToken: string,
  rowIndex: number
): Promise<void> {
  const rowNumber = rowIndex + 2;
  // Google Sheets doesn't have an easy "delete row" REST endpoint without batchUpdate with sheetId.
  // Instead, a simpler and robust way to "delete" a row or soft-delete it is to blank it out, or we can fetch sheetId and send a deleteDimension request.
  // Let's implement deleteDimension properly to keep the sheet clean!
  
  // 1. Get the sheet metadata to find the sheet ID of "สินค้า"
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(sheetId,title))`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  
  if (!metaRes.ok) {
    throw new Error(`Failed to get sheet metadata: ${metaRes.statusText}`);
  }
  
  const metaData = await metaRes.json();
  const sheets = metaData.sheets || [];
  const productSheet = sheets.find((s: any) => s.properties.title === 'สินค้า');
  if (!productSheet) {
    throw new Error(`Sheet 'สินค้า' not found.`);
  }
  const sheetId = productSheet.properties.sheetId;
  
  // 2. Execute deleteDimension request
  const deleteUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const body = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: sheetId,
            dimension: 'ROWS',
            startIndex: rowNumber - 1, // 0-based, inclusive
            endIndex: rowNumber, // 0-based, exclusive (so rowNumber is deleted)
          },
        },
      },
    ],
  };
  
  const deleteRes = await fetch(deleteUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!deleteRes.ok) {
    throw new Error(`Failed to delete row: ${deleteRes.statusText}`);
  }
}

export async function ensureRoleSheetExists(spreadsheetId: string, accessToken: string): Promise<void> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets(properties(title))`;
  const metaRes = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!metaRes.ok) {
    throw new Error(`Failed to get sheet metadata: ${metaRes.statusText}`);
  }
  const metaData = await metaRes.json();
  const sheets = metaData.sheets || [];
  const hasRoleSheet = sheets.some((s: any) => s.properties.title === 'สิทธิ์การเข้าใช้งาน');

  if (!hasRoleSheet) {
    // 1. Add sheet
    const addUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
    const addBody = {
      requests: [
        {
          addSheet: {
            properties: {
              title: 'สิทธิ์การเข้าใช้งาน',
              gridProperties: {
                frozenRowCount: 1,
              }
            }
          }
        }
      ]
    };
    const addRes = await fetch(addUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(addBody),
    });
    if (!addRes.ok) {
      throw new Error(`Failed to add 'สิทธิ์การเข้าใช้งาน' sheet: ${addRes.statusText}`);
    }

    // 2. Initialize headers
    const initUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สิทธิ์การเข้าใช้งาน'!A1:E1?valueInputOption=USER_ENTERED`;
    await fetch(initUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'สิทธิ์การเข้าใช้งาน'!A1:E1",
        majorDimension: 'ROWS',
        values: [['อีเมล', 'ชื่อ', 'บทบาท', 'สถานี/หน่วยงาน', 'อัปเดตล่าสุด']],
      }),
    });
  }
}

export async function fetchUserRoles(spreadsheetId: string, accessToken: string): Promise<UserRoleMapping[]> {
  await ensureRoleSheetExists(spreadsheetId, accessToken);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สิทธิ์การเข้าใช้งาน'!A2:E500`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch user roles: ${res.statusText}`);
  }
  const data = await res.json();
  if (!data.values) return [];
  return data.values.map((row: string[]) => {
    let station = '';
    let updatedAt = '';

    if (row.length >= 5) {
      station = row[3] || '';
      updatedAt = row[4] || '';
    } else {
      // Backwards compatibility for existing 4-column sheets
      updatedAt = row[3] || '';
    }

    return {
      email: row[0] || '',
      name: row[1] || '',
      role: (row[2] as 'แอดมิน' | 'ผู้ใช้งาน') || 'ผู้ใช้งาน',
      station,
      updatedAt,
    };
  });
}

export async function saveUserRole(
  spreadsheetId: string,
  accessToken: string,
  mapping: UserRoleMapping
): Promise<void> {
  const roles = await fetchUserRoles(spreadsheetId, accessToken);
  const index = roles.findIndex((r) => r.email.toLowerCase() === mapping.email.toLowerCase());

  if (index === -1) {
    // Append new
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สิทธิ์การเข้าใช้งาน'!A:E:append?valueInputOption=USER_ENTERED`;
    const row = [mapping.email, mapping.name, mapping.role, mapping.station || '', mapping.updatedAt];
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: "'สิทธิ์การเข้าใช้งาน'!A:E",
        majorDimension: 'ROWS',
        values: [row],
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to append user role: ${res.statusText}`);
    }
  } else {
    // Update existing row
    const rowNumber = index + 2;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'สิทธิ์การเข้าใช้งาน'!A${rowNumber}:E${rowNumber}?valueInputOption=USER_ENTERED`;
    const row = [mapping.email, mapping.name, mapping.role, mapping.station || '', mapping.updatedAt];
    const res = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        range: `'สิทธิ์การเข้าใช้งาน'!A${rowNumber}:E${rowNumber}`,
        majorDimension: 'ROWS',
        values: [row],
      }),
    });
    if (!res.ok) {
      throw new Error(`Failed to update user role at row ${rowNumber}: ${res.statusText}`);
    }
  }
}
