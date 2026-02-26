import { useState } from 'react';
import { useCityStore } from '../../stores/cityStore';
import { SheetsService } from '../../services/sheetsService';
import { useUIStore } from '../../stores/uiStore';
import { PageHeader } from '../components/PageHeader';
import type { ShoppingItem } from '../../types';

export function Shopping() {
  const shoppingItems = useCityStore(s => s.moduleData.shoppingItems);
  const setModuleData = useCityStore(s => s.setModuleData);
  const addToast = useUIStore(s => s.addToast);

  const [showForm, setShowForm] = useState(false);
  const [itemName, setItemName] = useState('');
  const [listName, setListName] = useState('Groceries');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('');

  // Group by list name
  const lists = Array.from(new Set(shoppingItems.map(i => i.listName || 'General')));
  const [activeList, setActiveList] = useState(lists[0] || 'Groceries');

  const listItems = shoppingItems.filter(i => (i.listName || 'General') === activeList);

  // Group by category within the list
  const categories = Array.from(new Set(listItems.map(i => i.category || 'Uncategorized')));

  const totalPrice = listItems.reduce((sum, i) => sum + (parseFloat(i.estimatedPrice) || 0) * (parseInt(i.quantity) || 1), 0);
  const checkedCount = listItems.filter(i => i.checked === 'true').length;

  const toggleItem = (id: string) => {
    const updated = shoppingItems.map(i =>
      i.id === id ? { ...i, checked: i.checked === 'true' ? 'false' : 'true', updatedAt: new Date().toISOString() } : i
    );
    setModuleData('shoppingItems', updated);
    const item = updated.find(i => i.id === id);
    if (item) SheetsService.update('ShoppingItems', item).catch(() => addToast('Sync failed', 'error'));
  };

  const addItem = () => {
    if (!itemName.trim()) return;
    const item: ShoppingItem = {
      id: `shop_${crypto.randomUUID()}`,
      residentId: '',
      listName: listName || 'Groceries',
      itemName: itemName.trim(),
      quantity,
      unit: '',
      estimatedPrice: price,
      checked: 'false',
      category: category || 'Uncategorized',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setModuleData('shoppingItems', [...shoppingItems, item]);
    SheetsService.append('ShoppingItems', item).catch(() => addToast('Sync failed', 'error'));
    setItemName('');
    setPrice('');
    setShowForm(false);
    addToast('Item added', 'success');
  };

  const deleteItem = (id: string) => {
    setModuleData('shoppingItems', shoppingItems.filter(i => i.id !== id));
    SheetsService.deleteRow('ShoppingItems', id).catch(() => addToast('Sync failed', 'error'));
  };

  // All lists for tabs
  const allLists = Array.from(new Set([...lists, listName || 'Groceries']));

  return (
    <>
      <PageHeader
        title="Shopping"
        description={`${shoppingItems.length} items across ${lists.length || 1} lists`}
        actions={
          <button className="btn btn--primary" onClick={() => setShowForm(!showForm)}>
            + Add Item
          </button>
        }
      />

      {showForm && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 2 }}>
              <label className="form-label">Item</label>
              <input className="form-input" value={itemName} onChange={e => setItemName(e.target.value)} placeholder="Milk"
                onKeyDown={e => e.key === 'Enter' && addItem()} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">List</label>
              <input className="form-input" value={listName} onChange={e => setListName(e.target.value)} placeholder="Groceries" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Category</label>
              <input className="form-input" value={category} onChange={e => setCategory(e.target.value)} placeholder="Dairy" />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Qty</label>
              <input className="form-input" type="number" value={quantity} onChange={e => setQuantity(e.target.value)} />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Price</label>
              <input className="form-input" type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn--secondary" onClick={() => setShowForm(false)}>Cancel</button>
            <button className="btn btn--primary" onClick={addItem}>Add</button>
          </div>
        </div>
      )}

      <div className="tabs">
        {allLists.map(list => (
          <button
            key={list}
            className={`tab ${activeList === list ? 'tab--active' : ''}`}
            onClick={() => setActiveList(list)}
          >
            {list}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 24, marginBottom: 20, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span>{checkedCount}/{listItems.length} checked</span>
        {totalPrice > 0 && <span>Est. total: ${totalPrice.toFixed(2)}</span>}
      </div>

      {listItems.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__icon">&#x1F6D2;</div>
          <div className="empty-state__text">Empty list</div>
          <div className="empty-state__sub">Add items to get started</div>
        </div>
      ) : (
        categories.map(cat => {
          const catItems = listItems.filter(i => (i.category || 'Uncategorized') === cat);
          return (
            <div key={cat} className="shopping-group">
              <div className="shopping-group__title">{cat}</div>
              {catItems.map(item => (
                <div key={item.id} className="shopping-item">
                  <button
                    className={`shopping-item__check ${item.checked === 'true' ? 'shopping-item__check--checked' : ''}`}
                    onClick={() => toggleItem(item.id)}
                  >
                    {item.checked === 'true' ? '\u2713' : ''}
                  </button>
                  <span className={`shopping-item__name ${item.checked === 'true' ? 'shopping-item__name--checked' : ''}`}>
                    {item.itemName}
                    {item.quantity && item.quantity !== '1' && (
                      <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>x{item.quantity}</span>
                    )}
                  </span>
                  {item.estimatedPrice && (
                    <span className="shopping-item__price">${parseFloat(item.estimatedPrice).toFixed(2)}</span>
                  )}
                  <button className="btn btn--ghost btn--sm" onClick={() => deleteItem(item.id)}>&#x2715;</button>
                </div>
              ))}
            </div>
          );
        })
      )}
    </>
  );
}
