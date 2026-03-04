import { useState, useMemo, useCallback } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { useUIStore } from '../../stores/uiStore';
import { SheetsService } from '../../services/sheetsService';
import { badgeUrl, MODULE_BADGE_IDS } from '../../config/pokemon';
import type { Resident, ShoppingItem } from '../../types';

const DEFAULT_LIST = 'Groceries';

export function ShoppingModule({ resident }: { resident: Resident }) {
  const moduleData = useCityStore(s => s.moduleData);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addCityXP = useCityStore(s => s.addCityXP);
  const addToast = useUIStore(s => s.addToast);

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

  // Derive unique list names
  const listNames = useMemo(() => {
    const names = new Set(residentItems.map(i => i.listName));
    names.add(activeList); // ensure current list always shows
    return Array.from(names).sort();
  }, [residentItems, activeList]);

  // Items for the active list
  const listItems = useMemo(
    () => residentItems.filter(i => i.listName === activeList),
    [residentItems, activeList],
  );

  // Group items by category
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    for (const item of listItems) {
      const cat = item.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    // Sort category keys, keeping Uncategorized last
    const keys = Object.keys(groups).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
    return keys.map(cat => ({ category: cat, items: groups[cat] }));
  }, [listItems]);

  // Estimated total for unchecked items
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

  // ── Create new list ──
  const handleCreateList = useCallback(() => {
    const name = newListName.trim();
    if (!name) return;
    setActiveList(name);
    setNewListName('');
    setShowNewList(false);
    addToast(`List "${name}" created`, 'success');
  }, [newListName, addToast]);

  // ── Quick-add item ──
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

    // Optimistic update
    const prev = allItems;
    setModuleData('shoppingItems', [...allItems, item]);
    setQuickAdd('');

    try {
      await SheetsService.append('ShoppingItems', item);
    } catch {
      setModuleData('shoppingItems', prev);
      addToast('Failed to add item', 'error');
    }
  }, [quickAdd, resident.id, activeList, allItems, setModuleData, addToast]);

  // ── Detail form add ──
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

    const prev = allItems;
    setModuleData('shoppingItems', [...allItems, item]);
    setDetailForm({ itemName: '', quantity: '1', unit: '', estimatedPrice: '', category: '' });
    setShowDetailForm(false);
    addToast('Item added', 'success');

    try {
      await SheetsService.append('ShoppingItems', item);
    } catch {
      setModuleData('shoppingItems', prev);
      addToast('Failed to add item', 'error');
    }
  }, [detailForm, resident.id, activeList, allItems, setModuleData, addToast]);

  // ── Toggle checked ──
  const handleToggle = useCallback(async (item: ShoppingItem) => {
    const updated: ShoppingItem = {
      ...item,
      checked: item.checked === 'true' ? 'false' : 'true',
      updatedAt: new Date().toISOString(),
    };

    const prev = allItems;
    setModuleData('shoppingItems', allItems.map(i => i.id === item.id ? updated : i));
    if (updated.checked === 'true') addCityXP(2, 'shopping');

    try {
      await SheetsService.update('ShoppingItems', updated);
    } catch {
      setModuleData('shoppingItems', prev);
      addToast('Failed to update item', 'error');
    }
  }, [allItems, setModuleData, addToast, addCityXP]);

  // ── Delete single item ──
  const handleDelete = useCallback(async (id: string) => {
    const prev = allItems;
    setModuleData('shoppingItems', allItems.filter(i => i.id !== id));
    addToast('Item removed', 'info');

    try {
      await SheetsService.deleteRow('ShoppingItems', id);
    } catch {
      setModuleData('shoppingItems', prev);
      addToast('Failed to delete item', 'error');
    }
  }, [allItems, setModuleData, addToast]);

  // ── Clear all checked ──
  const handleClearChecked = useCallback(async () => {
    const checkedItems = listItems.filter(i => i.checked === 'true');
    if (checkedItems.length === 0) return;

    const prev = allItems;
    const checkedIds = new Set(checkedItems.map(i => i.id));
    setModuleData('shoppingItems', allItems.filter(i => !checkedIds.has(i.id)));
    addToast(`${checkedItems.length} item${checkedItems.length > 1 ? 's' : ''} cleared`, 'success');

    // Delete from sheets — handle partial failures
    const results = await Promise.allSettled(
      checkedItems.map(item => SheetsService.deleteRow('ShoppingItems', item.id)),
    );
    const failedIds = new Set(
      results
        .map((r, i) => (r.status === 'rejected' ? checkedItems[i].id : null))
        .filter(Boolean) as string[],
    );
    if (failedIds.size > 0) {
      // Restore only items that failed to delete from Sheets
      const currentItems = useCityStore.getState().moduleData.shoppingItems;
      const failedItems = prev.filter(i => failedIds.has(i.id));
      setModuleData('shoppingItems', [...currentItems, ...failedItems]);
      addToast(`${failedIds.size} item(s) failed to delete`, 'error');
    }
  }, [listItems, allItems, setModuleData, addToast]);

  return (
    <div>
      {/* Header */}
      <div className="mod-header">
        <span className="mod-header__title-wrap">
          <img src={badgeUrl(MODULE_BADGE_IDS.shopping)} alt="" className="pokecity-badge pokecity-badge--mod" />
          <span className="mod-title">Shopping Lists</span>
        </span>
        <button
          className="mod-btn mod-btn--sm"
          onClick={() => setShowDetailForm(!showDetailForm)}
        >
          {showDetailForm ? 'Cancel' : '+ Detail'}
        </button>
      </div>

      {/* List selector */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
        <select
          value={activeList}
          onChange={e => setActiveList(e.target.value)}
          style={{ flex: 1 }}
        >
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

      {/* Quick-add */}
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

      {/* Detail form */}
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

      {/* Items grouped by category */}
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
                <div
                  className={`checkbox${item.checked === 'true' ? ' checked' : ''}`}
                  onClick={() => handleToggle(item)}
                >
                  {item.checked === 'true' ? '\u2713' : ''}
                </div>
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
                      {item.quantity && item.quantity !== '1' && (
                        <span> each</span>
                      )}
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

      {/* Footer: total + clear checked */}
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
