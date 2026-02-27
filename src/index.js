

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // 允许跨域请求
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // 处理预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      if (path === '/api/query' && request.method === 'POST') {
        return handleQuery(env.DB, await request.json());
      } else if (path === '/api/update' && request.method === 'POST') {
        return handleUpdate(env.DB, await request.json());
      } else if (path === '/api/table/create' && request.method === 'POST') {
        return handleCreateTable(env.DB, await request.json());
      } else if (path === '/api/table/delete' && request.method === 'POST') {
        return handleDeleteTable(env.DB, await request.json());
      } else if (path === '/api/tables' && request.method === 'GET') {
        return handleGetTables(env.DB);
      } else if (path === '/api/table-info' && request.method === 'POST') {
        return handleGetTableInfo(env.DB, await request.json());
      } else {
        // 返回主页
        const html = await import('../index.html');
        return new Response(html.default, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }
};

// 处理查询请求
async function handleQuery(db, data) {
  const { query } = data;
  
  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: '无效的查询语句' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 验证是SELECT语句
  if (!/^[\s()]*SELECT/i.test(query)) {
    return new Response(JSON.stringify({ error: '此接口只接受SELECT查询' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const startTime = Date.now();
    const stmt = db.prepare(query);
    const result = await stmt.all();
    const duration = Date.now() - startTime;
    
    return new Response(JSON.stringify({ 
      results: result.results || [],
      meta: result.meta || {},
      duration: duration
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理更新请求
async function handleUpdate(db, data) {
  const { query } = data;
  
  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: '无效的SQL语句' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 验证是更新语句
  if (/^[\s()]*(SELECT|WITH)/i.test(query)) {
    return new Response(JSON.stringify({ error: '此接口不能执行SELECT查询' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const startTime = Date.now();
    const stmt = db.prepare(query);
    const result = await stmt.run();
    const duration = Date.now() - startTime;
    
    return new Response(JSON.stringify({ 
      success: true,
      rowsAffected: result.meta.changes,
      duration: duration
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理创建表请求
async function handleCreateTable(db, data) {
  const { tableName, schema } = data;
  
  if (!schema || typeof schema !== 'string') {
    return new Response(JSON.stringify({ error: '表结构定义不能为空' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // 验证是CREATE TABLE语句
  if (!/^[\s()]*CREATE\s+TABLE/i.test(schema)) {
    return new Response(JSON.stringify({ error: '表结构定义必须是CREATE TABLE语句' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const stmt = db.prepare(schema);
    await stmt.run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理删除表请求
async function handleDeleteTable(db, data) {
  const { tableName } = data;
  
  if (!tableName || typeof tableName !== 'string') {
    return new Response(JSON.stringify({ error: '表名不能为空' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    // 首先检查表是否存在
    const checkStmt = db.prepare(`SELECT name FROM sqlite_schema WHERE type='table' AND name = ?`);
    const result = await checkStmt.bind(tableName).all();
    
    if (result.results.length === 0) {
      return new Response(JSON.stringify({ error: `表 "${tableName}" 不存在` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // 删除表
    const stmt = db.prepare(`DROP TABLE ${tableName}`);
    await stmt.run();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 获取所有表
async function handleGetTables(db) {
  try {
    const stmt = db.prepare(`SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name`);
    const result = await stmt.all();
    
    return new Response(JSON.stringify({ tables: result.results || [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 获取表信息
async function handleGetTableInfo(db, data) {
  const { tableName } = data;
  
  if (tableName) {
    // 获取特定表的信息
    try {
      // 获取列信息
      const columnStmt = db.prepare(`PRAGMA table_info(${tableName})`);
      const columnResult = await columnStmt.all();
      
      // 转换列信息格式
      const columns = (columnResult.results || []).map(col => ({
        name: col.name,
        type: col.type,
        nullable: !col.notnull,
        default_value: col.dflt_value,
        is_primary_key: !!col.pk
      }));
      
      // 获取索引信息
      const indexStmt = db.prepare(`PRAGMA index_list(${tableName})`);
      const indexResult = await indexStmt.all();
      
      // 获取每个索引的列信息
      const indexes = [];
      for (const idx of indexResult.results || []) {
        const indexDetailStmt = db.prepare(`PRAGMA index_info(${idx.name})`);
        const indexDetailResult = await indexDetailStmt.all();
        
        indexes.push({
          name: idx.name,
          unique: !!idx.unique,
          columns: (indexDetailResult.results || []).map(detail => detail.name)
        });
      }
      
      return new Response(JSON.stringify({ 
        columns,
        indexes
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } else {
    // 获取所有表的信息
    try {
      // 首先获取所有表名
      const tableStmt = db.prepare(`SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name`);
      const tableResult = await tableStmt.all();
      
      const tables = [];
      
      for (const table of tableResult.results || []) {
        // 获取列信息
        const columnStmt = db.prepare(`PRAGMA table_info(${table.name})`);
        const columnResult = await columnStmt.all();
        
        // 转换列信息格式
        const columns = (columnResult.results || []).map(col => ({
          name: col.name,
          type: col.type,
          nullable: !col.notnull,
          default_value: col.dflt_value,
          is_primary_key: !!col.pk
        }));
        
        tables.push({
          tableName: table.name,
          columns
        });
      }
      
      return new Response(JSON.stringify({ tables }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }
}