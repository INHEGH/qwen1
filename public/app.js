// D1 数据库管理工具前端脚本
// 用于与后端 API 交互以执行数据库操作

// 切换标签页功能
function openTab(evt, tabName) {
    // 隐藏所有标签内容
    const tabContent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabContent.length; i++) {
        tabContent[i].style.display = "none";
    }

    // 移除所有活动标签按钮的激活状态
    const tabLinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].className = tabLinks[i].className.replace(" active", "");
    }

    // 显示当前标签并设置激活状态
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// 执行SELECT查询
async function executeQuery() {
    const sqlQuery = document.getElementById('sqlQuery').value.trim();
    const resultDiv = document.getElementById('queryResult');
    
    if (!sqlQuery) {
        resultDiv.innerHTML = '<div class="error">请输入SQL查询语句</div>';
        return;
    }
    
    // 确保是SELECT语句
    if (!/^[\s()]*SELECT/i.test(sqlQuery)) {
        resultDiv.innerHTML = '<div class="error">此功能仅用于SELECT查询，请使用“执行更新”按钮执行INSERT/UPDATE/DELETE操作</div>';
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div>正在执行查询...</div>';
        
        // 发送请求到后端API
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sqlQuery })
        });
        
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">错误: ${data.error}</div>`;
        } else {
            displayResults(data.results, resultDiv);
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
    }
}

// 执行更新操作（INSERT/UPDATE/DELETE）
async function executeUpdate() {
    const sqlQuery = document.getElementById('sqlQuery').value.trim();
    const resultDiv = document.getElementById('queryResult');
    
    if (!sqlQuery) {
        resultDiv.innerHTML = '<div class="error">请输入SQL语句</div>';
        return;
    }
    
    // 确保是更新语句
    if (/^[\s()]*(SELECT|WITH)/i.test(sqlQuery)) {
        resultDiv.innerHTML = '<div class="error">SELECT查询请使用“执行查询”按钮</div>';
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div>正在执行更新...</div>';
        
        // 发送请求到后端API
        const response = await fetch('/api/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: sqlQuery })
        });
        
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">错误: ${data.error}</div>`;
        } else {
            resultDiv.innerHTML = `<div class="success">操作成功完成<br>受影响行数: ${data.rowsAffected || 0}<br>执行时间: ${data.duration}ms</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
    }
}

// 创建表
async function createTable() {
    const tableName = document.getElementById('tableName').value.trim();
    const tableSchema = document.getElementById('tableSchema').value.trim();
    const resultDiv = document.getElementById('tableResult');
    
    if (!tableName) {
        resultDiv.innerHTML = '<div class="error">请输入表名</div>';
        return;
    }
    
    if (!tableSchema) {
        resultDiv.innerHTML = '<div class="error">请输入表结构定义</div>';
        return;
    }
    
    // 验证是否为CREATE TABLE语句
    if (!/^[\s()]*CREATE\s+TABLE/i.test(tableSchema)) {
        resultDiv.innerHTML = '<div class="error">表结构定义必须是CREATE TABLE语句</div>';
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div>正在创建表...</div>';
        
        // 发送请求到后端API
        const response = await fetch('/api/table/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tableName, schema: tableSchema })
        });
        
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">错误: ${data.error}</div>`;
        } else {
            resultDiv.innerHTML = `<div class="success">表 "${tableName}" 创建成功</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
    }
}

// 删除表
async function deleteTable() {
    const tableName = document.getElementById('tableName').value.trim();
    const resultDiv = document.getElementById('tableResult');
    
    if (!tableName) {
        resultDiv.innerHTML = '<div class="error">请输入要删除的表名</div>';
        return;
    }
    
    // 确认删除操作
    if (!confirm(`确定要删除表 "${tableName}" 吗？此操作不可逆！`)) {
        return;
    }
    
    try {
        resultDiv.innerHTML = '<div>正在删除表...</div>';
        
        // 发送请求到后端API
        const response = await fetch('/api/table/delete', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tableName })
        });
        
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">错误: ${data.error}</div>`;
        } else {
            resultDiv.innerHTML = `<div class="success">表 "${tableName}" 删除成功</div>`;
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
    }
}

// 显示所有表
async function showTables() {
    const resultDiv = document.getElementById('structureResult');
    
    try {
        resultDiv.innerHTML = '<div>正在获取表列表...</div>';
        
        // 发送请求到后端API
        const response = await fetch('/api/tables');
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">错误: ${data.error}</div>`;
        } else {
            if (data.tables && data.tables.length > 0) {
                let tableHTML = '<h3>数据库中的表</h3><table><tr><th>表名</th></tr>';
                data.tables.forEach(table => {
                    tableHTML += `<tr><td>${table.name}</td></tr>`;
                });
                tableHTML += '</table>';
                resultDiv.innerHTML = tableHTML;
            } else {
                resultDiv.innerHTML = '<div>数据库中没有表</div>';
            }
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
    }
}

// 显示表信息
async function showTableInfo() {
    const tableName = document.getElementById('infoTableName').value.trim();
    const resultDiv = document.getElementById('structureResult');
    
    try {
        resultDiv.innerHTML = '<div>正在获取表信息...</div>';
        
        let endpoint = '/api/table-info';
        let requestBody = {};
        
        if (tableName) {
            endpoint = '/api/table-info';
            requestBody = { tableName };
        }
        
        // 发送请求到后端API
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        
        const data = await response.json();
        
        if (data.error) {
            resultDiv.innerHTML = `<div class="error">错误: ${data.error}</div>`;
        } else {
            if (tableName && data.columns) {
                // 显示特定表的列信息
                let tableHTML = `<h3>表 "${tableName}" 的结构</h3>`;
                tableHTML += '<table><tr><th>列名</th><th>类型</th><th>是否为空</th><th>默认值</th><th>主键</th></tr>';
                
                data.columns.forEach(col => {
                    tableHTML += `<tr>
                        <td>${col.name}</td>
                        <td>${col.type}</td>
                        <td>${col.nullable ? 'YES' : 'NO'}</td>
                        <td>${col.default_value !== null ? col.default_value : ''}</td>
                        <td>${col.is_primary_key ? 'YES' : 'NO'}</td>
                    </tr>`;
                });
                
                tableHTML += '</table>';
                
                // 如果有索引信息，也显示出来
                if (data.indexes && data.indexes.length > 0) {
                    tableHTML += '<h3>索引</h3><table><tr><th>索引名</th><th>唯一性</th><th>列</th></tr>';
                    
                    data.indexes.forEach(idx => {
                        tableHTML += `<tr>
                            <td>${idx.name}</td>
                            <td>${idx.unique ? 'UNIQUE' : 'NONUNIQUE'}</td>
                            <td>${idx.columns.join(', ')}</td>
                        </tr>`;
                    });
                    
                    tableHTML += '</table>';
                }
                
                resultDiv.innerHTML = tableHTML;
            } else if (!tableName && data.tables) {
                // 显示所有表的简要信息
                let tableHTML = '<h3>所有表及其列信息</h3>';
                
                data.tables.forEach(table => {
                    tableHTML += `<h4>表: ${table.tableName}</h4>`;
                    tableHTML += '<table><tr><th>列名</th><th>类型</th><th>是否为空</th><th>默认值</th><th>主键</th></tr>';
                    
                    table.columns.forEach(col => {
                        tableHTML += `<tr>
                            <td>${col.name}</td>
                            <td>${col.type}</td>
                            <td>${col.nullable ? 'YES' : 'NO'}</td>
                            <td>${col.default_value !== null ? col.default_value : ''}</td>
                            <td>${col.is_primary_key ? 'YES' : 'NO'}</td>
                        </tr>`;
                    });
                    
                    tableHTML += '</table>';
                });
                
                resultDiv.innerHTML = tableHTML;
            } else {
                resultDiv.innerHTML = '<div>未找到表信息</div>';
            }
        }
    } catch (error) {
        resultDiv.innerHTML = `<div class="error">请求失败: ${error.message}</div>`;
    }
}

// 辅助函数：将结果数据显示为表格
function displayResults(results, containerElement) {
    if (!results || results.length === 0) {
        containerElement.innerHTML = '<div>查询成功，但没有返回数据</div>';
        return;
    }
    
    // 获取列名
    const columns = Object.keys(results[0]);
    
    // 创建表格HTML
    let tableHTML = '<table><tr>';
    columns.forEach(col => {
        tableHTML += `<th>${col}</th>`;
    });
    tableHTML += '</tr>';
    
    // 添加数据行
    results.forEach(row => {
        tableHTML += '<tr>';
        columns.forEach(col => {
            tableHTML += `<td>${row[col] !== null ? row[col] : '<em>NULL</em>'}</td>`;
        });
        tableHTML += '</tr>';
    });
    
    tableHTML += '</table>';
    
    containerElement.innerHTML = tableHTML;
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 设置默认激活的标签页
    const activeTab = document.querySelector('.tablinks.active');
    if (activeTab) {
        activeTab.click();
    }
});