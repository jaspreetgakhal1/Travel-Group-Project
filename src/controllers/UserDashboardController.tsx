import React, { useMemo, useState } from 'react';
import {
  chatMessages,
  expenseCategories,
  initialCosts,
  navItems,
  type ExpenseCategory,
} from '../models/dashboardModel';
import ChatInterfaceView from '../views/ChatInterfaceView';
import ExpenseTrackerView from '../views/ExpenseTrackerView';
import UserDashboardView from '../views/UserDashboardView';

const UserDashboardController: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<ExpenseCategory>('Transport');
  const [costs, setCosts] = useState<Record<ExpenseCategory, number>>(initialCosts);

  const handleCostChange = (category: ExpenseCategory, value: string) => {
    const parsed = Number(value);
    const numericValue = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;

    setCosts((previous) => ({
      ...previous,
      [category]: numericValue,
    }));
  };

  const totalSharedCost = useMemo(
    () => expenseCategories.reduce((total, category) => total + costs[category], 0),
    [costs],
  );

  return (
    <UserDashboardView
      navItems={navItems}
      chatPanel={<ChatInterfaceView messages={chatMessages} />}
      expensePanel={
        <ExpenseTrackerView
          categories={expenseCategories}
          activeCategory={activeCategory}
          costs={costs}
          totalSharedCost={totalSharedCost}
          onCategoryChange={setActiveCategory}
          onCostChange={handleCostChange}
        />
      }
    />
  );
};

export default UserDashboardController;
