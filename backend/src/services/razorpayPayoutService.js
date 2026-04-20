import axios from "axios";
import { v4 as uuidv4 } from "uuid"; 

export const rzpX = axios.create({
  baseURL: "https://api.razorpay.com/v1",
  auth: {
    username: process.env.RAZORPAY_KEY_ID,
    password: process.env.RAZORPAY_SECRET,
  },
});

export const createFundAccountIdIfNotExists = async (deliveryPerson) => {
  if (deliveryPerson.razorpayFundAccountId) {
    return deliveryPerson.razorpayFundAccountId;
  }

  const bank = deliveryPerson.getDecryptedBankDetails();

  if (!deliveryPerson.userId?.email) {
    throw new Error("Delivery person email not loaded");
  }

  let contactId = deliveryPerson.razorpayContactId;

  if (!contactId) {
    const { data: contact } = await rzpX.post("/contacts", {
      name: deliveryPerson.fullname,
      email: deliveryPerson.userId.email,
      contact: deliveryPerson.phone,
      type: "vendor",
    });
    contactId = contact.id;
    deliveryPerson.razorpayContactId = contactId;
  }

  const { data: fundAccount } = await rzpX.post("/fund_accounts", {
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
