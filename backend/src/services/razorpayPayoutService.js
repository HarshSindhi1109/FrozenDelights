import razorpay from "../config/razorpay.js";

export const createFundAccountIdIfNotExists = async (deliveryPerson) => {
  if (deliveryPerson.razorpayFundAccountId) {
    return deliveryPerson.razorpayFundAccountId;
  }

  const bank = deliveryPerson.getDecryptedBankDetails();

  if (!deliveryPerson.userId?.email) {
    throw new Error("Delivery person email not loaded");
  }

  //  Create contact (only if not exists)
  let contactId = deliveryPerson.razorpayContactId;

  if (!contactId) {
    const contact = await razorpay.contacts.create({
      name: deliveryPerson.fullname,
      email: deliveryPerson.userId.email,
      contact: deliveryPerson.phone,
      type: "vendor",
    });

    contactId = contact.id;
    deliveryPerson.razorpayContactId = contactId;
  }

  //  Create fund account
  const fundAccount = await razorpay.fund_accounts.create({
    contact_id: contactId,
    account_type: "bank_account",
    bank_account: {
      name: deliveryPerson.fullname,
      ifsc: bank.ifscCode,
      account_number: bank.accountNumber,
    },
  });

  deliveryPerson.razorpayFundAccountId = fundAccount.id;
  await deliveryPerson.save();

  return fundAccount.id;
};
