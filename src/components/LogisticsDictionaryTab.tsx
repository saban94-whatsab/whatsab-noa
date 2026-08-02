import React, { useState } from 'react';
import { BookOpen, Plus, Search, Tag, DollarSign, Package, Check } from 'lucide-react';
import { useWhatsAppStore } from '../store/useWhatsAppStore';

export const LogisticsDictionaryTab: React.FC = () => {
  const { logisticsDictionary } = useWhatsAppStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredItems = logisticsDictionary.filter(
    (item) =>
      item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.includes(searchTerm) ||
      item.aliases.some((a) => a.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header Search & Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#202c33] p-4 rounded-xl border border-[#2a3942]">
        <div className="relative flex-1 w-full max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-3 text-[#8696a0]" />
          <input
            type="text"
            placeholder="חפש לפי מקט, שם מוצר או מילות מפתח (מילון_לוגיסטי)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-10 py-2 bg-[#111b21] border border-[#2a3942] rounded-lg text-sm text-[#e9edef] placeholder-[#8696a0] focus:outline-none focus:border-[#00a884]"
            id="input-search-logistics-dict"
          />
        </div>

        <div className="text-xs text-[#8696a0] flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-[#00a884]" />
          <span>מילון מיפוי מק"טים פעיל מול נועה AI ({logisticsDictionary.length} מוצרים)</span>
        </div>
      </div>

      {/* Dictionary Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredItems.map((item) => (
          <div
            key={item.sku}
            className="bg-[#202c33] border border-[#2a3942] rounded-xl p-4 space-y-3 hover:border-[#00a884]/40 transition-colors"
            id={`dict-item-${item.sku}`}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-[#00a884]/20 text-[#00a884] px-2 py-0.5 rounded text-xs font-bold">
                    מק"ט: {item.sku}
                  </span>
                  <span className="text-xs text-[#8696a0] px-2 py-0.5 rounded bg-[#111b21] border border-[#2a3942]">
                    {item.category}
                  </span>
                </div>
                <h4 className="font-bold text-[#e9edef] text-base mt-1">{item.productName}</h4>
              </div>

              <div className="text-left font-mono">
                <span className="text-xs text-[#8696a0]">מחיר יחידה:</span>
                <p className="text-base font-bold text-[#00a884]">₪{item.unitPrice} <span className="text-xs text-[#8696a0]">/ {item.unit}</span></p>
              </div>
            </div>

            {/* Aliases List */}
            <div className="bg-[#111b21] p-3 rounded-lg border border-[#2a3942]">
              <span className="text-xs text-[#8696a0] font-semibold block mb-1.5 flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-cyan-400" />
                <span>מילות מפתח ושמות מנורמלים בוואטסאפ:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {item.aliases.map((alias, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 bg-[#202c33] border border-[#2a3942] rounded text-xs text-[#e9edef] font-mono"
                  >
                    "{alias}"
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
