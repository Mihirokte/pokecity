import { useState, useMemo, useCallback } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { useModuleSync } from '../../hooks/useModuleSync';
import { SheetsService } from '../../services/sheetsService';
import { ModuleHeader } from '../ui/ModuleHeader';
import { Checkbox } from '../ui/Checkbox';
import type { Resident, ShoppingItem } from '../../types';

const DEFAULT_LIST = 'Groceries';

export function ShoppingModule({ resident }: { resident: Resident }) {
  const moduleData = useCityStore(s => s.moduleData);
  const addToast = useUIStore(s => s.addToast);
  const sync = useModuleSync();

  const [activeList, setActiveList] = useState<string>(DEFAULT_LIST);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [quickAdd, setQuickAdd] = useState('');
  const [showDetailForm, setShowDetailForm] = useState(false);
  const [detailForm, setDetailForm] = useState({
    itemName: '',
    quantity: '1',
    unit: '',
    estimatedPrice: '',
    category: '',
  });

  const allItems = moduleData.shoppingItems;
  const residentItems = useMemo(
    () => allItems.filter(i => i.residentId === resident.id),
    [allItems, resident.id],
  );

  // Sentinel items (itemName === '__list__') anchor list names in Sheets without showing in UI
  const realItems = useMemo(
    () => residentItems.filter(i => i.itemName !== '__list__'),
    [residentItems],
  );

  const listNames = useMemo(() => {
    const names = new Set(residentItems.map(i => i.listName));
    names.add(activeList);
    return Array.from(names).sort();
  }, [residentItems, activeList]);

  const listItems = useMemo(
    () => realItems.filter(i => i.listName === activeList),
    [realItems, activeList],
  );

  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    for (const item of listItems) {
      const cat = item.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
    return keys.map(cat => ({ category: cat, items: groups[cat] }));
  }, [listItems]);

  const estimatedTotal = useMemo(() => {
    return listItems.reduce((sum, item) => {
      if (item.checked === 'true') return sum;
      const price = parseFloat(item.estimatedPrice) || 0;
      const qty = parseFloat(item.quantity) || 0;
      return sum + price * qty;
    }, 0);
  }, [listItems]);

  const checkedCount = useMemo(
    () => listItems.filter(i => i.checked === 'true').length,
    [listItems],
  );

  const handleCreateList = useCallback(async () => {
    const name = newListName.trim();
    if (!name) return;
    setActiveList(name);
    setNewListName('');
    setShowNewList(false);
    addToast(`List "${name}" created`, 'success');

    // If no items exist for this list name yet, persist a sentinel item so the
    // list survives page reload (list names are derived from ShoppingItems rows).
    const alreadyExists = residentItems.some(i => i.listName === name);
    if (!alreadyExists) {
      const now = new Date().toISOString();
      const sentinel: ShoppingItem = {
        id: `shop_${crypto.randomUUID()}`,
        residentId: resident.id,
        listName: name,
        itemName: '__list__',
        quantity: '0',
        unit: '',
        estimatedPrice: '',
        checked: 'false',
        category: '',
        createdAt: now,
        updatedAt: now,
      };
      await sync('shoppingItems', allItems, [...allItems, sentinel],
        () => SheetsService.append('ShoppingItems', sentinel), 'Failed to save list');
    }
  }, [newListName, residentItems, resident.id, allItems, sync, addToast]);

  const handleQuickAdd = useCallback(async () => {
    const name = quickAdd.trim();
    if (!name) return;

    const now = new Date().toISOString();
    const item: ShoppingItem = {
      id: `shop_${crypto.randomUUID()}`,
      residentId: resident.id,
      listName: activeList,
      itemName: name,
      quantity: '1',
      unit: '',
      estimatedPrice: '',
      checked: 'false',
      category: '',
      createdAt: now,
      updatedAt: now,
    };

    setQuickAdd('');
    await sync('shoppingItems', allItems, [...allItems, item],
      () => SheetsService.append('ShoppingItems', item), 'Failed to add item');
  }, [quickAdd, resident.id, activeList, allItems, sync]);

  const handleDetailAdd = useCallback(async () => {
    if (!detailForm.itemName.trim()) {
      addToast('Item name is required', 'error');
      return;
    }

    const now = new Date().toISOString();
    const item: ShoppingItem = {
      id: `shop_${crypto.randomUUID()}`,
      residentId: resident.id,
      listName: activeList,
      itemName: detailForm.itemName.trim(),
      quantity: detailForm.quantity || '1',
      unit: detailForm.unit.trim(),
      estimatedPrice: detailForm.estimatedPrice.trim(),
      checked: 'false',
      category: detailForm.category.trim(),
      createdAt: now,
      updatedAt: now,
    };

    setDetailForm({ itemName: '', quantity: '1', unit: '', estimatedPrice: '', category: '' });
    setShowDetailForm(false);
    addToast('Item added', 'success');
    await sync('shoppingItems', allItems, [...allItems, item],
      () => SheetsService.append('ShoppingItems', item), 'Failed to add item');
  }, [detailForm, resident.id, activeList, allItems, sync, addToast]);

  const handleToggle = useCallback(async (item: ShoppingItem) => {
    const updated: ShoppingItem = {
      ...item,
      checked: item.checked === 'true' ? 'false' : 'true',
      updatedAt: new Date().toISOString(),
    };
    await sync('shoppingItems', allItems, allItems.map(i => i.id === item.id ? updated : i),
      () => SheetsService.update('ShoppingItems', updated), 'Failed to update item');
  }, [allItems, sync]);

  const handleDelete = useCallback(async (id: string) => {
    addToast('Item removed', 'info');
    await sync('shoppingItems', allItems, allItems.filter(i => i.id !== id),
      () => SheetsService.deleteRow('ShoppingItems', id), 'Failed to delete item');
  }, [allItems, sync, addToast]);

  const handleClearChecked = useCallback(async () => {
    const checkedItems = listItems.filter(i => i.checked === 'true');
    if (checkedItems.length === 0) return;

    const prev = allItems;
    const checkedIds = new Set(checkedItems.map(i => i.id));
    const setModuleData = useCityStore.getState().setModuleData;
    setModuleData('shoppingItems', allItems.filter(i => !checkedIds.has(i.id)));
    addToast(`${checkedItems.length} item${checkedItems.length > 1 ? 's' : ''} cleared`, 'success');

    const results = await Promise.allSettled(
      checkedItems.map(item => SheetsService.deleteRow('ShoppingItems', item.id)),
    );
    const failedIds = new Set(
      results
        .map((r, i) => (r.status === 'rejected' ? checkedItems[i].id : null))
        .filter(Boolean) as string[],
    );
    if (failedIds.size > 0) {
      const currentItems = useCityStore.getState().moduleData.shoppingItems;
      const failedItems = prev.filter(i => failedIds.has(i.id));
      setModuleData('shoppingItems', [...currentItems, ...failedItems]);
      addToast(`${failedIds.size} item(s) failed to delete`, 'error');
    }
  }, [listItems, allItems, addToast]);

  return (
    <div>
      <ModuleHeader moduleType="shopping" title="Shopping Lists">
        <button
          className="mod-btn mod-btn--sm"
          onClick={() => setShowDetailForm(!showDetailForm)}
        >
          {showDetailForm ? 'Cancel' : '+ Detail'}
        </button>
      </ModuleHeader>

      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <select value={activeList} onChange={e => setActiveList(e.target.value)} style={{ flex: 1 }}>
          {listNames.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
        {showNewList ? (
          <div style={{ display: 'flex', gap: 4 }}>
            <input
              autoFocus
              placeholder="List name..."
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreateList()}
              style={{ width: 100 }}
            />
            <button className="mod-btn mod-btn--sm" onClick={handleCreateList}>OK</button>
            <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => setShowNewList(false)}>X</button>
          </div>
        ) : (
          <button className="mod-btn mod-btn--sm" onClick={() => setShowNewList(true)}>New List</button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Quick add item..."
          value={quickAdd}
          onChange={e => setQuickAdd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
          style={{ flex: 1 }}
        />
        <button className="mod-btn mod-btn--sm" onClick={handleQuickAdd}>Add</button>
      </div>

      {showDetailForm && (
        <div className="mod-form" style={{ marginBottom: 12 }}>
          <label>
            Item Name
            <input
              type="text"
              placeholder="Item name..."
              value={detailForm.itemName}
              onChange={e => setDetailForm(f => ({ ...f, itemName: e.target.value }))}
            />
          </label>
          <div className="mod-form-row">
            <label>
              Qty
              <input
                type="text"
                placeholder="1"
                value={detailForm.quantity}
                onChange={e => setDetailForm(f => ({ ...f, quantity: e.target.value }))}
                style={{ width: 50 }}
              />
            </label>
            <label>
              Unit
              <input
                type="text"
                placeholder="e.g. lbs"
                value={detailForm.unit}
                onChange={e => setDetailForm(f => ({ ...f, unit: e.target.value }))}
              />
            </label>
            <label>
              Price
              <input
                type="text"
                placeholder="0.00"
                value={detailForm.estimatedPrice}
                onChange={e => setDetailForm(f => ({ ...f, estimatedPrice: e.target.value }))}
                style={{ width: 60 }}
              />
            </label>
          </div>
          <label>
            Category
            <input
              type="text"
              placeholder="e.g. Produce, Dairy..."
              value={detailForm.category}
              onChange={e => setDetailForm(f => ({ ...f, category: e.target.value }))}
            />
          </label>
          <div className="mod-form-actions">
            <button className="mod-btn" onClick={handleDetailAdd}>Add Item</button>
            <button className="mod-btn mod-btn--danger" onClick={() => setShowDetailForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {groupedItems.length === 0 ? (
        <div className="mod-empty">No items in this list yet.</div>
      ) : (
        groupedItems.map(group => (
          <div key={group.category} style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, color: '#8b9bb4', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
              {group.category}
            </div>
            {group.items.map(item => (
              <div
                key={item.id}
                className="mod-card"
                style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, opacity: item.checked === 'true' ? 0.5 : 1 }}
              >
                <Checkbox
                  checked={item.checked === 'true'}
                  onChange={() => handleToggle(item)}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, textDecoration: item.checked === 'true' ? 'line-through' : 'none' }}>
                    {item.itemName}
                    {item.quantity && item.quantity !== '1' && (
                      <span style={{ color: '#8b9bb4' }}> x{item.quantity}{item.unit ? ` ${item.unit}` : ''}</span>
                    )}
                    {item.quantity === '1' && item.unit && (
                      <span style={{ color: '#8b9bb4' }}> ({item.unit})</span>
                    )}
                  </div>
                  {item.estimatedPrice && (
                    <div style={{ fontSize: 8, color: '#8b9bb4' }}>
                      ${parseFloat(item.estimatedPrice).toFixed(2)}
                      {item.quantity && item.quantity !== '1' && <span> each</span>}
                    </div>
                  )}
                </div>
                <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={() => handleDelete(item.id)}>
                  Del
                </button>
              </div>
            ))}
          </div>
        ))
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <div style={{ fontSize: 10, color: '#ffcd75', fontFamily: 'dogicabold' }}>
          Est. Total: ${estimatedTotal.toFixed(2)}
        </div>
        {checkedCount > 0 && (
          <button className="mod-btn mod-btn--danger mod-btn--sm" onClick={handleClearChecked}>
            Clear Checked ({checkedCount})
          </button>
        )}
      </div>
    </div>
  );
}
