export const PAYCOM_ERRORS = {
  INVALID_AMOUNT: { code: -31001, message: { ru: 'Неверная сумма', uz: 'Notoʼgʼri summa', en: 'Invalid amount' } },
  ORDER_NOT_FOUND: { code: -31050, message: { ru: 'Заказ не найден', uz: 'Buyurtma topilmadi', en: 'Order not found' } },
  ORDER_UNAVAILABLE: { code: -31051, message: { ru: 'Заказ недоступен', uz: 'Buyurtma mavjud emas', en: 'Order unavailable' } },
  TRANSACTION_NOT_FOUND: { code: -31003, message: { ru: 'Транзакция не найдена', uz: 'Tranzaksiya topilmadi', en: 'Transaction not found' } },
  CANNOT_PERFORM: { code: -31008, message: { ru: 'Нельзя выполнить операцию', uz: 'Operatsiyani bajarib boʼlmaydi', en: 'Cannot perform operation' } },
  CANNOT_CANCEL: { code: -31007, message: { ru: 'Нельзя отменить', uz: 'Bekor qilib boʼlmaydi', en: 'Cannot cancel' } },
  AUTH: { code: -32504, message: { ru: 'Ошибка авторизации', uz: 'Avtorizatsiya xatosi', en: 'Authorization error' } },
  PARSE: { code: -32700, message: { ru: 'Ошибка парсинга', uz: 'Parsing xatosi', en: 'Parse error' } },
  METHOD: { code: -32601, message: { ru: 'Метод не найден', uz: 'Metod topilmadi', en: 'Method not found' } },
}
